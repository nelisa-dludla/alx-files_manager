import dbClient from '../utils/db'
import redisClient from '../utils/redis'

export const getStatus = (req, res) => {
	if (dbClient.isAlive && redisClient.isAlive) {
		res.status(200).json({ "redis": true, "db": true });
	}
};

export const getStats = async (req, res) => {
	try {
		const userCount = await dbClient.nbUsers();
		const fileCount = await dbClient.nbFiles();
		res.status(200).json({ "users": userCount, "files": fileCount });
	} catch (error) {
		res.status(500).json({ message: 'Internal Server Error' });
	}
};
