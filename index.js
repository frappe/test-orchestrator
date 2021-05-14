const express = require('express')
const app = express()

const schedule = require('node-schedule');

function validate_repo_token(req, res, next) {
	if (req.path == '/') {
		return next();
	}
	if (req.get('REPO-TOKEN') !== '2948288382838DE' || !req.get('CI-BUILD-ID') || !req.get('CI-INSTANCE-ID')) {
		console.log(`${req.path} | CI-BUILD-ID: ${req.get('CI-BUILD-ID')} | CI-INSTANCE-ID: ${req.get('CI-INSTANCE-ID')} | REPO-TOKEN: ${req.get('REPO-TOKEN')}`)
		res.statusMessage = 'Validation Error. Required headers are missing';
		return res.status(400).send('Validation Error. Required headers are missing!');
	}
	next()
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(validate_repo_token);

const test_map = {};

function get_ci_build_id(req) {
	return req.get('CI-BUILD-ID');
}

function get_ci_instance_id(req) {
	return req.get('CI-INSTANCE-ID');
}

app.get('/', (req, res) => {
	return res.send('Online!')
})

app.get('/register-instance', (req, res) => {
	const build_id = get_ci_build_id(req)
	const instance_id = get_ci_instance_id(req)
	if (!test_map[build_id] || test_map[build_id].test_spec_list.length === 0) {
		test_map[build_id] = {
			instance_map: {},
			created_on: new Date(),
			test_spec_list: req.body.test_spec_list
		}
	}

	test_map[build_id].instance_map[instance_id] = {
		test_list: [],
		test_status: 'ongoing',
		// consider first registered instance as master
		is_master: Object.keys(test_map[build_id].instance_map).length === 0
	}
	res.send(test_map[build_id].instance_map[instance_id])
})

app.get('/get-next-test-spec', (req, res) => {
	const build_id = get_ci_build_id(req)
	const instance_id = get_ci_instance_id(req)
	let next_test = test_map[build_id].test_spec_list.shift();
	test_map[build_id].instance_map[instance_id].test_list.push(next_test);

	res.send({
		'status': next_test ? 'ongoing': 'done',
		'next_test': next_test || ''
	})
})

app.get('/test-completed', (req, res) => {
	const build_id = get_ci_build_id(req)
	const instance_id = get_ci_instance_id(req)
	test_map[build_id].instance_map[instance_id].test_status = 'done';
	res.sendStatus(200);
})

app.get('/reset', (req, res) => {
	const build_id = get_ci_build_id(req)
	delete test_map[build_id];
	res.sendStatus(200)
})

app.get('/test-status', (req, res) => {
	const build_id = get_ci_build_id(req);
	let test_ongoing = false;

	test_ongoing = Object.keys(test_map[build_id].instance_map).some(instance_id => {
		return test_map[build_id].instance_map[instance_id].test_status == 'ongoing'
	})

	res.send({
		test_status: test_ongoing ? 'ongoing': 'done'
	})
})

const job = schedule.scheduleJob('0 0 * * *', () => {
	let date = new Date();
	date.setHours(date.getHours() - 5);
	console.log('---');
	Object.keys(test_map).forEach(build_id => {
		if (test_map[build_id].created_on < date || !test_map[build_id].test_spec_list.length) {
			console.log(`Cleaning data of build ID: ${build_id}`)
			delete test_map[build_id];
		}
	})
	console.log('---');
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running on port ${port}!`))
