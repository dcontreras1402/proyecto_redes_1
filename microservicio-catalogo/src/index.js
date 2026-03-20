require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const productosController = require('./controllers/productosController');

const app = express();

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

app.use(productosController);

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Puerto ${PORT}`);
});