const mongoose = require('mongoose')

// link database table name 'apshopdb'
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://admin:072193706@cluster0.scu2r.mongodb.net/apshopdb?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).catch(err => console.log(err))

const orderSchema = new mongoose.Schema({
    bankID: {type: String, required: true, minlength: 4, trim: true },
    orderDate: {type: String, required: true },
    orderTime: {type: String, required: true },
    cost: {type: String, required: true},
    address: {type: Array, required: true},  
    images: {type: String, required: true},
    orderList: {type: Array, required:true},
})



module.exports = mongoose.model('Order', orderSchema)