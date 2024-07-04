import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
	constructor() {
		this.client = createClient();

		this.client.on('error', (error) => {
			console.log(error);
		});
	}

	isAlive() {
		return this.client.connected;
	}

	async get(string) {
		const getAsync = promisify(this.client.get).bind(this.client);
		return await getAsync(string);
	}

	async set(key, value, duration) {
		const setAsync = promisify(this.client.set).bind(this.client);
		await setAsync(key, value, 'EX', duration);
	}

	async del(key) {
		const delAsync = promisify(this.client.del).bind(this.client);
		await delAsync(key);
	}
}

const redisClient = new RedisClient();
export default redisClient;
