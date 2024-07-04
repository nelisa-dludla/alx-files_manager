import express from 'express';
import router from './routes/index';
import bodyParser from 'body-parser';

const port = process.env.PORT ? process.env.PORT : 5000;
const app = express();

app.use(bodyParser.json());
app.use('/', router);

app.listen(port, () => {
	console.log(`Server running on port ${port}`);
});
