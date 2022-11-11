const mongoose = require('mongoose')

// link database table name 'apshopdb'
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://admin:072193706@cluster0.scu2r.mongodb.net/apshopdb?retryWrites=true&w=majority', {
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