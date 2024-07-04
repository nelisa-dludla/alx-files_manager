import Queue from 'bull';
import imageThumbnail from 'image-thumbnail';
import fs from 'fs';
import dbClient from './utils/db';

const fileQueue = new Queue('fileQueue');

fileQueue.process(async (job, done) => {
	const { userId, fileId } = job.data;

	if (!fileId) {
		done(new Error('Missing fileId'));
		return;
	}

	if (!userId) {
		done(new Error('Missing userId'));
		return;
	}

	const query = {
		_id: fileId,
		userId: userId,
	}

	const file = await dbClient.db.collection('files').findOne(query);
	if (!file) {
		done(new Error('File not found'));
		return;
	}

	const sizes = [100, 250, 500];
	try {
		for (const size of sizes) {
			const thumbnail = await imageThumbnail(file.localPath, { width: size });
			const thumbnailPath = `$file.localPath_${size}`
			fs.writeFileSync(thumbnailPath, thumbnail);
		}
		done();
	} catch(error) {
		done(error);
	}
});
