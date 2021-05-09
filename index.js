const express = require('express')
const app = express()


function validate_repo_token(req, res, next) {
	if (req.header('REPO-TOKEN') !== '2948288382838DE' || !req.get('CI-BUILD-ID') || !req.get('CI-INSTANCE-ID')) {
		return res.sendStatus(400)
	}
	console.log(req.path, req.get('CI-BUILD-ID'), req.get('CI-INSTANCE-ID'), req.header('REPO-TOKEN'))
	next()
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(validate_repo_token);

const test_map = {}


function get_ci_build_id(req) {
	console.log(req.get('CI-BUILD-ID'))
	return req.get('CI-BUILD-ID');
}

function get_ci_instance_id(req) {
	return req.get('CI-INSTANCE-ID');
}

app.get('/register-instance', (req, res) => {
	const build_id = get_ci_build_id(req)
	const instance_id = get_ci_instance_id(req)
	console.log(req.body)

	if (!test_map[build_id] || test_map[build_id].test_spec_list.length === 0) {
		test_map[build_id] = {
			instance_map: {},
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

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}!`))
