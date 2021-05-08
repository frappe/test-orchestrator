const express = require('express')
const body_parser = require('body-parser');
const file_upload = require('express-fileupload');
const fs = require('fs');
const zip = require('express-zip');

const app = express()

const test_map = {}

function validate_repo_token(req, res, next) {
	if (req.header('REPO-TOKEN') !== '2948288382838DE' || !req.get('CI-BUILD-ID') || !req.get('CI-INSTANCE-ID')) {
		return res.sendStatus(400)
	}
	console.log(req.path, req.get('CI-BUILD-ID'), req.get('CI-INSTANCE-ID'), req.header('REPO-TOKEN'))
	next()
}

app.use(body_parser.urlencoded({ extended: true }));
app.use(file_upload());
app.use(validate_repo_token)

function get_ci_build_id(req) {
	console.log(req.get('CI-BUILD-ID'))
	return req.get('CI-BUILD-ID');
}

function get_ci_instance_id(req) {
	return req.get('CI-INSTANCE-ID');
}

app.get('/init-test', (req, res) => {
	const build_id = get_ci_build_id(req)
	const instance_id = get_ci_instance_id(req)

	if (!test_map[build_id] || test_map[build_id].test_spec_list.length === 0) {
		test_map[build_id] = {
			instance_map: {},
			test_spec_list: req.body.test_spec_list
		}
	}

	test_map[build_id].instance_map[instance_id] = {
		test_list: [],
		coverage_file_path: '',
		coverage_filename: '',
		test_status: 'ongoing',
		// consider first registered instance as master
		is_master: Object.keys(test_map[build_id].instance_map).length === 0
	}
	res.send(test_map[build_id].instance_map[instance_id])
})

app.get('/get-next-test', (req, res) => {
	const build_id = get_ci_build_id(req)
	const instance_id = get_ci_instance_id(req)
	let next_test = test_map[build_id].test_spec_list.shift();
	test_map[build_id].instance_map[instance_id].test_list.push(next_test);

	if (!next_test) {
		console.log(test_map[build_id])
	}

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

app.post('/upload-coverage-file', (req, res) => {
	const build_id = get_ci_build_id(req)
	const instance_id = get_ci_instance_id(req)
	let cov_file;
	let upload_path;

	if (!req.files || Object.keys(req.files).length === 0) {
		return res.status(400).send('No files were uploaded.');
	}

	cov_file = req.files.upload_file;
	upload_dir = `${__dirname}/coverage_files/${build_id}`;
	!fs.existsSync(upload_dir) && fs.mkdirSync(upload_dir);
	upload_path = `${upload_dir}/${cov_file.name}`;

	cov_file.mv(upload_path).then(() => {
		test_map[build_id].instance_map[instance_id].coverage_file_path = upload_path;
		test_map[build_id].instance_map[instance_id].coverage_filename = cov_file.name;
		res.send('File uploaded!');
	}).catch(err => {
		res.status(500).send(err);
	})
});

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

app.get('/download-coverage-files', (req, res) => {
	const build_id = get_ci_build_id(req);
	let files = []

	Object.keys(test_map[build_id].instance_map).forEach(instance_id => {
		let coverage_file_path = test_map[build_id].instance_map[instance_id].coverage_file_path;
		let coverage_filename = test_map[build_id].instance_map[instance_id].coverage_filename;
		if (coverage_file_path) {
			files.push({
				path: coverage_file_path,
				name: coverage_filename
			})
		}
	})
	console.log(files)
	res.zip(files)
})

// Start the Express server
app.listen(3000, () => console.log('Server running on port 3000!'))
