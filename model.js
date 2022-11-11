const mongoose = require('mongoose')

// auto way localhost and server setting
var keys = require('./config/key')
// link database table name 'apshopdb'
mongoose.connect(keys.mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).catch(err => console.log(err))

const modelSchema = new mongoose.Schema({
    productCode: {type: String, required: true, minlength: 6, trim: true },
    name: {type: String, required: true },
    price: {type: Number, required: true },
    mainDescription: {type: String, required: true},
    subDescription: {type: String, required: true},  
    images: {type: String, required: true},
    productRemain: {type: Number, required:true},
})



module.exports = mongoose.model('Product', modelSchema)