const express = require('express')
const Customer = require('./customer')
const Product = require('./model')
const ejs = require('ejs')
const bodyParser = require('body-parser')
//const { request, response } = require('express')
const cookieParser = require('cookie-parser')
const session = require('express-session')
//ใช้กับ online
const port = process.env.PORT

//ใช้กับ localhost
//const port = 3000
//const customer = require('./customer')
const app = express()

const fs = require('fs')
const formidable = require('formidable')

app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static('public'))

app.use(cookieParser())
app.use(session({
    secret: 'login-logout',
    resave: false,
    saveUninitialized: false,
}))

//Main page
app.all('/', (request, response) => {

    if (request.session.login) { // อ่านค่าใน session
        let userName = request.session.firstname
        let quantity = request.session.quantity || ''

        if (quantity == '') {
            quantity = '0'
        }

        // อ่านข้อมูล database และส่งไปแสดงที่ card กรณีทำการ log-in แล้ว
        Product.find().exec((err, docs) => {
            response.render('index', { logedIn: true, user: userName, data: docs, qtyInCart: quantity })
        })
        //ถ้าไม่ได้ log-in
    } else {
        let quantity = request.session.quantity || ''
        if (quantity == '') {
            quantity = '0'
        }
        // อ่านข้อมูล database และส่งไปแสดงที่ card
        Product.find().exec((err, docs) => {
            response.render('index', { logedIn: false, data: docs, qtyInCart: quantity })
        })

    }

})
//Sign in page
app.all('/signin', (request, response) => {

    if (!request.body.firstname) {
        response.render('signin')
    } else {
        let form = request.body
        let data = {
            firstname: form.firstname || '',
            lastname: form.lastname || '',
            email: form.email || '',
            password: form.password || '',
            password2: form.password2 || '',
            phoneNumber: form.phoneNumber || '',
            address: form.address || '',
            city: form.city || '',
            province: form.province || '',
            zipcode: form.zipcode || ''
        }
        // อ่านชื่อ อีเมล์ เพื่อตรวจสอบว่ามีการใช้อีเมล์นี้สมัครหรือยัง
        let email = form.email || ''
        let emailDataBase = ''
        Customer
            .find().select('email')
            .where('email').equals(email)
            .exec((err, docs) => {
                if (!err) {
                    for (d of docs) {
                        emailDataBase = d.email
                        //console.log(emailDataBase, email)
                    }
                    if (emailDataBase == email) {
                        response.render('signin', { result: 'A' }) // A แทน result ถ้า email ซ้ำ
                    } else {
                        Customer.create(data, err => {
                            let r = (err) ? false : true
                            response.render('signin', { result: r })
                        })
                    }
                }
            })
    }
})

// Log in page

app.all('/login', (request, response) => {
    //อ่านข้อมูลจากฟอร์มที่ส่งเข้า
    let login = request.cookies.login || ''
    let password = request.cookies.password || ''
    let saveCookie = request.cookies.save || ''
    let logedIn = false
    let valid = false

    let email = ''
    let passwordCheck = ''
    let firstname = ''

    //กรณีที่ผู้ใช้เปิดมายังเพจนี้ แต่ได้เข้าสู่ระบบไปก่อนนี้แล้ว
    if (request.session.login) {
        let login = request.session.login;
        response.render('login', { login: login, logedIn: true })

    } else if (!request.body.login) {
        response.render('login', {
            login: login,
            password: password,
            save: saveCookie,
            logedIn: false
        })
    } else { //กรณีที่ส่งข้อมูลจากฟอร์มเข้ามา
        //อ่านข้อมูลจากอิลิเมนต์ของฟอร์ม
        login = request.body.login || ''
        password = request.body.password || ''
        saveCookie = request.body.save || ''

        // อ่านข้อมูลจาก database ชื่อ และ password

        Customer
            .find().select('email password firstname')
            .where('email').equals(login)
            .exec((err, docs) => {
                if (!err) {
                    for (d of docs) {

                        email = d.email
                        passwordCheck = d.password
                        firstname = d.firstname
                        //console.log(email, passwordCheck, firstname)


                        //ถ้าใส่ข้อมูลถูกต้อง

                        if (login == email && password == passwordCheck) {
                            //ถ้าเลือกให้จัดเก็บข้อมูลไว้ในเครื่อง ก็บันทึกเป็นคุกกี้
                            if (request.body.save) {
                                let age = 30 * 60 * 1000
                                response.cookie('login', login, { maxAge: age })
                                response.cookie('password', password, { maxAge: age })
                                response.cookie('save', saveCookie, { maxAge: age })

                                //ถ้าไม่เลือกเก็บในเครื่อง แต่อาจมีคุกกี้เดิมเก็บไว้ ก็ให้ลบทิ้งไป
                            } else {
                                response.clearCookie('login')
                                response.clearCookie('password')
                                response.clearCookie('save')
                            }

                            //จัดเก็บข้อมูล login ไว้ในเซสชัน เพื่อใช้ตรวจสอบในภายหลัง
                            request.session.login = login
                            request.session.firstname = firstname
                            logedIn = true
                            valid = true
                        } else {
                            password = ''
                        }

                        response.render('login',
                            { login: firstname, password: password, save: saveCookie, logedIn: logedIn, valid: valid })

                    }
                }
            })
    }


})

// Log-out 

app.get('/signout', (request, response) => {

    if (request.session.login) {
        request.session.destroy((err) => { })
    }

    response.redirect('/')
})


// หน้า admin log-in สำหรับ add-product
app.all('/admin777/add-product', (request, response) => {

    if (!request.body.userName) {
        response.render('admin777')
    }
    else {
        //อ่านข้อมูลจาก form
        let userName = request.body.userName || ''
        let userPassword = request.body.userPassword || ''
        if (userName == 'aobpan7723' && userPassword == '777') {

            //let age = 30 * 60 * 1000 //cookie มีอายุ 30 นาที.
            //response.cookie('userName', userName, { maxAge: age })

            request.session.userName = userName // จำผู้ใช้เมื่อ login แล้ว
            response.render('add-product', { user: userName })
        } else {
            response.render('admin777', { msg: 'user name หรือ password ไม่ถูกต้อง' })
        }
    }
})

// หน้า web management จัดการร้าน
app.all('/web-management', (request, response) => {

    response.render('web-management')
})

// เพิ่มรายการสินค้าใหม่
app.all('/add-product', (request, response) => {


    if (request.session.userName) {
        // response.render('add-product', { user: userName }) //ถ้า login แล้ว


        if (request.method == 'GET') {
            let userName = request.session.userName
            response.render('add-product', { user: userName })
            return
        }
        else {
            let userName = request.session.userName
            let form = new formidable.IncomingForm({ multiples: true })

            form.parse(request, (err, fields, files) => {

                let upfiles = files.upfiles
                if (!Array.isArray(files.upfiles)) {
                    if (files.upfiles.name == '') {  //ถ้าไม่ได้เลือกไฟล์
                        response.render('add-product', { user: userName })
                        return
                    } else {		                //ถ้าเลือกไฟล์เดียว
                        upfiles = [files.upfiles]
                    }
                }

                //const dir = 'public/product-images/'
                let fileNames = []  //เก็บชื่อของแต่ละไฟล์

                for (f of upfiles) {
                    //let newfile = dir + f.name
                    let newName = f.name

                    // while (fs.existsSync(newfile)) {        
                    //    let oldName = f.name.split('.')
                    //     let r = Math.floor(Math.random() * 999999)
                    //     oldName[0] += '_' + r
                    //     newName = oldName.join('.')
                    //    newfile = dir + newName
                    // }
                    fileNames.push(newName)
                    //fs.rename(f.path, newfile, err => { }) 
                }

                //นำชื่อไฟล์มารวมเป็นสตริงเดียวกัน
                let imgFiles = fileNames.join(',')
                let data = {
                    productCode: fields.productCode,
                    name: fields.name,
                    price: fields.price,
                    mainDescription: fields.mainDescription,
                    subDescription: fields.subDescription,
                    images: imgFiles,
                    productRemain: fields.productRemain,
                }

                // ตรวจสอบว่า product code ซ้ำกันหรือไม่ก่อน ทำการบันทึก

                let productCode = fields.productCode
                let productCodeCheck = ''
                Product
                    .find().select('productCode')
                    .where('productCode').equals(productCode)
                    .exec((err, docs) => {
                        if (!err) {
                            for (d of docs) {
                                productCodeCheck = d.productCode
                            }
                            if (productCode == productCodeCheck) {
                                response.render('add-product', { msg: 'รหัสสินค้าซ้ำกัน', user: userName })
                            } else {
                                Product.create(data, err => {
                                    let r = (err) ? 'ข้อมูลไม่ถูกบันทึก' : 'ข้อมูลบันทึกแล้ว'
                                    response.render('add-product', { msg: r, user: userName })
                                })
                            }
                        }
                    })
            })
        }
    } else {
        response.render('admin777/add-product') //ถ้าไม่ได้ทำการ login ให้เปิดหน้าทำการ login
    }

})

// รายละเอียดย่อยของแต่ละสินค้า พร้อมการเลือกจำนวน และสั่งซื้อ

app.all('/product-description', (request, response) => {

    //อ่านค่า product code ใน hidden type input มาเทียบกับ database เพื่ออ่านชื่อรูปภาพ

    let productCode = request.body.productCode || ''
    let productName = request.body.productName || ''
    let productDescription = request.body.productDescription || ''
    let productPrice = request.body.productPrice || ''
    let qtyBuyProduct = request.body.qtyBuyProduct || ''
    let productImage = request.body.productImage || ''
    let productRemain = request.body.productRemain || ''

    let userName = request.session.firstname
    let listInCart = [] //เก็บ list รายการและจำนวนสินค้าในรถเข็น
    let listMainInCart = request.session.userID || [] //array เก็บข้อมูลหลัก list รายการและจำนวนสินค้าในรถเข็น
    let quantity = request.session.quantity || ''
    
    Product
        .find()
        .where('productCode').equals(productCode)
        .exec((err, docs) => {
            if (!err) {
                if (!request.session.login) { //เข้ามาแบบไม่ได้ log-in

                    if (!request.body.qtyBuyProduct) {

                        if (quantity == '') { //มาหน้านี้ครั้งแรก
                            quantity = '0'
                        }
                        
                        response.render('product-description', { logedIn: false, data: docs, qtyInCart: quantity })

                    } else { // check product code ถ้าในรถเข็นมีแล้ว ให้ทำการบวกจำนวนเพิ่มเข้าไป และลบข้อมูลเก่าทิ้งไป
                        let sumQty = 0
                        for (i in listMainInCart) {

                            if (listMainInCart[i].includes(productCode)) {

                                sumQty = parseInt(listMainInCart[i][4]) + parseInt(qtyBuyProduct)
                                if (sumQty <= parseInt(productRemain)) { // ถ้าบวกกันแล้วไม่เกินของที่เหลือในคลัง
                                    qtyBuyProduct = sumQty.toString()
                                } else {
                                    qtyBuyProduct = productRemain //ถ้าซื้อมากกว่าที่มีในคลังให้มีค่าเท่ากับของที่เหลือในคลัง
                                }

                                // ลบข้อมูลในรายการนี้ออกเพื่อทำการเพิ่มเข้าไปใหม่
                                let dataDelete = listMainInCart.splice(i, 1)
                            }
                        }
                        listInCart.push(productCode, productName, productDescription, productPrice, qtyBuyProduct, productImage, productRemain)
                        listMainInCart.push(listInCart)
                        console.log(listInCart[0], listInCart[1], listInCart[2], listInCart[3], listInCart[4])
                        console.log(listMainInCart[0], listMainInCart[1], listMainInCart[2], listMainInCart[3], listMainInCart[4])
                        console.log(listMainInCart.length)
                        request.session.quantity = listMainInCart.length.toString()
                        request.session.userID = listMainInCart
                        quantity = listMainInCart.length.toString()
                        //request.session.cookie.maxAge = 30 * 60 * 1000 // กำหนดเวลา session ของผู้ใช้
                        response.render('product-description', { logedIn: false, data: docs, qtyInCart: quantity, msg: 'ใส่รถเข็นแล้ว' })

                    }

                    // เข้ามาแบบ log-in แล้ว
                } else {

                    //ถ้ามาหน้านี้ครั้งแรกและ log-in แล้ว

                    if (!request.body.qtyBuyProduct) {

                        if (quantity == '') { //มาหน้านี้ครั้งแรก
                            quantity = '0'
                        }

                        response.render('product-description', { logedIn: true, user: userName, data: docs, qtyInCart: quantity })

                    } else { // check product code ถ้าในรถเข็นมีแล้ว ให้ทำการบวกจำนวนเพิ่มเข้าไป และลบข้อมูลเก่าทิ้งไป
                        let sumQty = 0
                        for (i in listMainInCart) {

                            if (listMainInCart[i].includes(productCode)) {

                                sumQty = parseInt(listMainInCart[i][4]) + parseInt(qtyBuyProduct)
                                if (sumQty <= parseInt(productRemain)) { // ถ้าบวกกันแล้วไม่เกินของที่เหลือในคลัง
                                    qtyBuyProduct = sumQty.toString()
                                } else {
                                    qtyBuyProduct = productRemain //ถ้าซื้อมากกว่าที่มีในคลังให้มีค่าเท่ากับของที่เหลือในคลัง
                                }

                                // ลบข้อมูลในรายการนี้ออกเพื่อทำการเพิ่มเข้าไปใหม่
                                let dataDelete = listMainInCart.splice(i, 1)
                            }
                        }
                        listInCart.push(productCode, productName, productDescription, productPrice, qtyBuyProduct, productImage, productRemain)
                        listMainInCart.push(listInCart)
                        console.log(listInCart[0], listInCart[1], listInCart[2], listInCart[3], listInCart[4])
                        console.log(listMainInCart[0], listMainInCart[1], listMainInCart[2], listMainInCart[3], listMainInCart[4])
                        console.log(listMainInCart.length)
                        request.session.quantity = listMainInCart.length.toString()
                        request.session.userID = listMainInCart
                        quantity = listMainInCart.length.toString()
                        request.session.cookie.maxAge = 30 * 60 * 1000 // กำหนดเวลา session ของผู้ใช้
                        response.render('product-description', { logedIn: true, user: userName, data: docs, qtyInCart: quantity, msg: 'ใส่รถเข็นแล้ว' })

                    }

                }
            }
        })
})

// เพิ่มการสั่งซื้อสินค้าไปยังรถเข็น

app.all('/product-cart', (request, response) => {


    let userName = request.session.firstname
    // กรณีผู้ใช้ยังไม่ได้ทำการ log-in

    if (!request.session.login) {
        response.render('products-InCart',{logedIn: false})
    } else {
        // กรณีผู้ใช้ยังได้ทำการ log-in แล้ว

        response.render('products-InCart', { logedIn: true, user: userName })
    }
})



app.listen(port, () => console.log('Server started on port: 3000'))