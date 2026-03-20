require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const ordenesController = require('./controllers/ordenesController');

const app = express();

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(ordenesController);

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
    console.log(`Puerto ${PORT}`);
});