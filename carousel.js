const mongoose = require('mongoose')

// link database table name 'apshopdb'
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://admin:072193706@cluster0.scu2r.mongodb.net/apshopdb?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).catch(err => console.log(err))

const carouselSchema = new mongoose.Schema({
    productCode: {type: String, required: true, minlength: 6, trim: true },
    images: {type: String, required: true},
    label: {type: String, required: true},
    content: {type: String, required: true},
})


module.exports = mongoose.model('Carousel', carouselSchema)