import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { lookup } from 'mime-types';
import Queue from 'bull';
import { ObjectId } from 'mongodb';

const fileQueue = new Queue('fileQueue');

export const postUpload = async (req, res) => {
	// Retrieve token
	const token = req.headers['x-token'];
	const key = `auth_${token}`;
	const userId = await redisClient.get(key);
	// Convert userId to a ObjectId
	const objectId = new ObjectId(userId);
	// Find user
	const user = await dbClient.db.collection('users').findOne({'_id':objectId});
	if (user) {
		// File types
		const fileTypes = ['folder', 'file', 'image'];
		// Retrieve file details
		const { name, type, parentId, isPublic, data } = req.body;
		// Check name
		if (!name) {
			res.status(400).json({"error":"Missing name"});
			return;
		}
		// Check if type is allowed
		if (!type || !fileTypes.includes(type)) {
			res.status(400).json({"error":"Missing type"});
			return;
		}
		// Check data and if type is allowed
		if (!data && type !== 'folder') {
			res.status(400).json({"error":"Missing data"});
			return;
		}
		// Check parentId
		if (parentId) {
			const parentObjectId = new ObjectId(parentId);
			const result = await dbClient.db.collection('files').findOne({"_id": parentObjectId});
			if (!result) {
				res.status(400).json({"error":"Parent not found"});
				return;
			}

			if (result.type !== 'folder') {
				res.status(400).json({"error":"Parent is not a folder"});
				return;
			}
		}

		if (type === 'folder') {
			const newDocument = {
				userId: user._id,
				name: name,
				type: type,
				parentId: parentId || 0,
				isPublic: isPublic || false,
				parentId: parentId || 0,
			}

			await dbClient.db.collection('files').save(newDocument);
			res.status(201).json(newDocument);
			return;
		}
		// Folder path
		let folderPath = process.env.FOLDER_PATH;
		if (!folderPath) {
			folderPath = '/tmp/files_manager';
		}

		fs.mkdirSync(folderPath, { recursive: true });
		const localPath = `${folderPath}/${uuidv4()}`;
		fs.writeFileSync(localPath, data, 'base64');
		const newDocument = {
			userId: user._id,
			name: name,
			type: type,
			parentId: parentId || 0,
			isPublic: isPublic || false,
			parentId: parentId || 0,
			localPath: localPath,
		}

		await dbClient.db.collection('files').save(newDocument);
		if (type === 'image') {
			const newlyAddedDocument = await dbClient.db.collection('files').findOne(newDocument);
			const details = {
				userId: user._id,
				fileId: newlyAddedDocument._id,
			}
			fileQueue.add(details);
		}
		res.status(201).json(newDocument);
		return;

	} else {
		res.status(401).json({"error":"Unauthorized"});
		return;
	}
};

export const getShow = async (req, res) => {
	// Retrieve id
	const fileId = req.params.id;
	// Retrieve token
	const token = req.headers['x-token'];
	const key = `auth_${token}`;
	const userId = await redisClient.get(key);
	// Convert userId to a ObjectId
	const objectId = new ObjectId(userId);
	// Find user
	const user = await dbClient.db.collection('users').findOne({'_id':objectId});
	if (user) {
		const fileObjectId = new ObjectId(fileId);
		const query = {
			_id: fileObjectId,
			userId: user._id,
		}

		const result = await dbClient.db.collection('files').findOne(query);
		if (result) {
			res.json(result);
			return;
		} else {
			res.status(404).json({"error":"Not found"});
			return;
		}
	} else {
		res.status(401).json({"error":"Unauthorized"});
		return;
	}
};

export const getIndex = async (req, res) => {
	// Retrieve parentId
	let parentId = req.query['parentId'];
	if (!parentId) {
		parentId = 0;
	}
	// Retrieve page
	const pageNumber = parseInt(req.params.page, 10) || 0;
	// Retrieve token
	const token = req.headers['x-token'];
	const key = `auth_${token}`;
	const userId = await redisClient.get(key);
	// Convert userId to a ObjectId
	const objectId = new ObjectId(userId);
	// Find user
	const user = await dbClient.db.collection('users').findOne({'_id':objectId});
	if (user) {
		const query = {
			userId: user._id,
			parentId: parentId,
		}

		const pageSize = 20;

		const pipeline = [
			{ $match: query },
			{ $skip: pageNumber * pageSize },
			{ $limit: pageSize },
		];

		const results = await dbClient.db.collection('files').aggregate(pipeline).toArray();
		res.json(results);
		return;
	} else {
		res.status(401).json({"error":"Unauthorized"});
		return;
	}
};

export const putPublish = async (req, res) => {
	// Retrieve id
	const fileId = req.params.id;
	// Retrieve token
	const token = req.headers['x-token'];
	const key = `auth_${token}`;
	const userId = await redisClient.get(key);
	// Convert userId to a ObjectId
	const objectId = new ObjectId(userId);
	// Find user
	const user = await dbClient.db.collection('users').findOne({'_id':objectId});
	if (user) {
		const fileObjectId = new ObjectId(fileId);
		const filter = {
			_id: fileObjectId
		}
		const updateValue = {
			$set: { isPublic: true }
		}
		const options = {
			returnDocument: 'after'
		}

		const updatedDocument = await dbClient.db.collection('files').findOneAndUpdate(filter, updateValue, options);
		if (!updatedDocument) {
			res.status(404).json({"error":"Not found"});
			return;
		}
		res.status(200).json(updatedDocument.value);
		return;

	} else {
		res.status(401).json({"error":"Unauthorized"});
		return;
	}
}

export const putUnpublish = async (req, res) => {
	// Retrieve id
	const fileId = req.params.id;
	// Retrieve token
	const token = req.headers['x-token'];
	const key = `auth_${token}`;
	const userId = await redisClient.get(key);
	// Convert userId to a ObjectId
	const objectId = new ObjectId(userId);
	// Find user
	const user = await dbClient.db.collection('users').findOne({'_id':objectId});
	if (user) {
		const fileObjectId = new ObjectId(fileId);
		const filter = {
			_id: fileObjectId
		}
		const updateValue = {
			$set: { isPublic: false }
		}
		const options = {
			returnDocument: 'after'
		}

		const updatedDocument = await dbClient.db.collection('files').findOneAndUpdate(filter, updateValue, options);
		if (!updatedDocument) {
			res.status(404).json({"error":"Not found"});
			return;
		}
		res.status(200).json(updatedDocument.value);
		return;

	} else {
		res.status(401).json({"error":"Unauthorized"});
		return;
	}
}

export const getFile = async (req, res) => {
	// Retrieve id
	const fileId = req.params.id;
	const fileObjectId = new ObjectId(fileId);
	// Retrieve token
	const token = req.headers['x-token'];
	const key = `auth_${token}`;
	const userId = await redisClient.get(key);
	// Convert userId to a ObjectId
	const objectId = new ObjectId(userId);
	// Find user
	const user = await dbClient.db.collection('users').findOne({'_id':objectId});
	const result = await dbClient.db.collection('files').findOne({'_id': fileObjectId});
	if (result) {
		if (!result.isPublic && result.userId.toString() != user._id.toString()) {
			res.status(404).json({"error": "Not found"});
			return;
		}

		if (result.type === 'folder') {
			res.status(404).json({"error": "A folder doesn't have content"});
			return;
		}

		const size = parseInt(req.query.size, 10);
		let filePath = result.localPath;
		if (size) {
			const allowedSizes = [100, 250, 500];
			if (!allowedSizes.includes(size)) {
				res.status(400).json({"error": "Invalid size"});
				return;
			}
			filePath = `${result.localPath}_${size}`;
		}

		if (!fs.existsSync(result.localPath)) {
			res.status(404).json({"error": "Not found"});
			return;
		}

		const mimeType = lookup(result.name);
		res.setHeader("Content-Type", mimeType);
		fs.createReadStream(filePath).pipe(res);
		return;
	} else {
		console.log('inside no result else');
		res.status(404).json({"error":"Not found"});
		return;
	}
};
