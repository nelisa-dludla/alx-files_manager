import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import { v4 as uuidv4 } from 'uuid';
import sha1 from 'sha1';
import { ObjectId } from 'mongodb';

export const getConnect = async (req, res) => {
	// Retrieve Authorization header
	const authHeader = req.headers['authorization'];
	// Check if header starts with "Basic "
	if (authHeader.startsWith('Basic ')) {
		// Split "Basic " and token
		const splitHeader = authHeader.split(' ');
		// Decode token
		const decodedToken = atob(splitHeader[1]);
		// Retrieve email and password from decodedToken
		const [ email, password ] = decodedToken.split(':');

		// Find user
		const user = await dbClient.db.collection('users').findOne({'email':email});
		if (!user) {
			res.status(401).json({"error":"Unauthorized"});
			return;
		}
		// Compare user.password with request password
		const hashedPassword = sha1(password);
		if (hashedPassword === user.password) {
			const token = uuidv4();
			const key = `auth_${token}`;
			await redisClient.set(key, user._id, 86400);
			res.status(200).json({ "token": token });
			return;
		} else {
			res.status(500).json({message: "Incorrect email or password"});
			return;
		}
		bcrypt.compare(password, user.password, async (error, result) => {
			if (error) {
				res.status(500).json({"error": "bcrypt failed to compare password"});
				return;
			}
		});
	} else {
		res.status(401).json({'error': 'Unauthorized'});
		return;
	}	
};

export const getDisconnect = async (req, res) => {
	// Retrieve X-Token header
	const token = req.headers['x-token'];
	const key = `auth_${token}`;
	const userId = await redisClient.get(key);
	// Convert userId to a ObjectId
	const objectId = new ObjectId(userId);
	// Find user
	const user = await dbClient.db.collection('users').findOne({'_id': objectId});
	if (user) {
		await redisClient.del(key);
		res.status(204).send();
		return;
	} else {
		res.status(401).json({"error":"Unauthorized"});
		return;
	}
};
