const mongoose = require('mongoose')
const paginate = require('mongoose-paginate-v2')
// link database table name 'apshopdb'
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).catch(err => console.log(err))

const customerSchema = new mongoose.Schema({
    firstname: {type: String, required: true },
    lastname: {type: String, required: true},
    email: {type: String, required: true},
    password:{type:String, required: true},
    password2:{type:String, required: true},
    phoneNumber:{type:String, required: true},
    address:{type:String, required: true},
    city:{type:String, required: true},
    province:{type:String, required: true},
    zipcode:{type:String, required: true}
})

customerSchema.plugin(paginate)

module.exports = mongoose.model('Customer', customerSchema)