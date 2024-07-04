import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import sha1 from 'sha1';
import { ObjectId } from 'mongodb';

export const postNew = async (req, res) => {
	const { email, password } = req.body;
	if (!email) {
		res.status(400).json({"error":"Missing email"});
		return;
	}
	if (!password) {
		res.status(400).json({"error":"Missing password"});
		return;
	}

	try {
		const existingUser = await dbClient.db.collection('users').findOne({'email': email});
		if (existingUser) {
			res.status(400).json({"error":"Already exist"});
			return;
		}
	} catch(error) {
		res.status(500).json({"error": "Internal server error"});
	}

	let hashedPassword = sha1(password);
	try {
		const result = await dbClient.db.collection('users').insertOne({'email': email, 'password': hashedPassword});
		const resultUserId = result.insertedId;
		res.status(201).json({"id":resultUserId,"email":email});
	} catch(error) {
		res.status(500).json({"error": "Internal server error"});
	}
};

export const getMe = async (req, res) => {
	// Retrieve token
	const token = req.headers['x-token'];
	const key = `auth_${token}`;
	const userId = await redisClient.get(key);
	// Convert userId to a ObjectId
	const objectId = new ObjectId(userId);
	// Find user
	const user = await dbClient.db.collection('users').findOne({'_id':objectId});
	if (user) {
		res.json({"id":user._id,"email":user.email});
		return;
	} else {
		res.status(401).json({"error":"Unauthorized"});
		return;
	}
};
