import { MongoClient } from 'mongodb';

const host = process.env.DB_HOST ? process.env.DB_HOST : 'localhost';
const port = process.env.DB_PORT ? process.env.DB_PORT : 27017;
const db = process.env.DB_DATABASE ? process.env.DB_DATABASE : 'files_manager';
const url = `mongodb://${host}:${port}/${db}`;


class DBClient {
	constructor() {
		this.connected = false;
		this.client = new MongoClient(url, { useUnifiedTopology: true });

		this.client.connect().then(() => {
			this.db = this.client.db();
			this.usersCollection = this.db.collection('users');
			this.filesCollection = this.db.collection('files');
			this.connected = true;
		}).catch((error) => {
			console.log(`MongoDB Connection Error: ${error}`);
			this.connected = false;
		});
	}

	isAlive() {
		return this.connected;
	}


	async nbUsers() {
		const userCount = this.usersCollection.countDocuments();
		return userCount;
	};

	async nbFiles() {
		const fileCount = this.filesCollection.countDocuments();
		return fileCount;
	}
}

const dbClient = new DBClient();
export default dbClient;
