require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const pagosController = require('./controllers/pagosController');

const app = express();

app.use(morgan('dev')); 
app.use(cors());
app.use(express.json());
app.use(pagosController); 

app.get('/health', (req, res) => {
    res.json({ 
        servicio: "Pagos", 
        estado: "OK"
    });
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => { 
    console.log(`Puerto ${PORT}`);
});