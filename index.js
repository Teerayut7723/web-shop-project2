const express = require('express')
const Customer = require('./customer')
const Product = require('./model')
const Order = require('./order')

const Carousel = require('./carousel') // db carousel

const ejs = require('ejs')
const bodyParser = require('body-parser')
//const { request, response } = require('express')
const cookieParser = require('cookie-parser')
const session = require('express-session')
//Mail send
const nodemailer = require('nodemailer')

//Resize- picture
const sharp = require('sharp')

//ใช้กับ online
const port = process.env.PORT || 3000

//ใช้กับ localhost
//const port = 3000
//const customer = require('./customer')
const app = express()

const fs = require('fs')
const formidable = require('formidable')
const { request } = require('http')
const { response } = require('express')
const { env } = require('process')
const { model, Promise } = require('mongoose')
const { time } = require('console')
//const order = require('./order')
const { resolve } = require('path')
const carousel = require('./carousel')

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

    let listMainInCart = request.session.userID || [] //array เก็บข้อมูลหลัก list รายการและจำนวนสินค้าในรถเข็น
    let dataQuantityList = request.body.dataQuantityList || '' //รับค่าจำนวนที่สั่งเพื่ออัพเดตใหม่ จากหน้าในรถเข็น

    request.session.itemOrder = [] // clear data ใน session เมื่อกดกลับมาที่หน้านี้

    if (dataQuantityList != '') {

        let dataListArr = dataQuantityList.split(',')
        for (i in listMainInCart) {
            if (listMainInCart[i][0] == dataListArr[0]) { //compare product code ตรงกันใน list หน้ารถเข็น

                listMainInCart[i][4] = dataListArr[1]
                dataListArr.splice(0, 2)
            }
        }

    }

    if (request.session.login) { // อ่านค่าใน session
        let userName = request.session.firstname || ''
        let quantity = request.session.quantity || ''

        if (quantity == '') {
            quantity = '0'
        }

        // อ่านข้อมูล database และส่งไปแสดงที่ card กรณีทำการ log-in แล้ว
        Product.find().exec((err, docs) => {
            Carousel.find().exec((err, carouselDoc) => {
                response.render('index', { logedIn: true, user: userName, data: docs, qtyInCart: quantity, dataCarousel: carouselDoc })
            })

        })
        //ถ้าไม่ได้ log-in
    } else {
        let quantity = request.session.quantity || ''
        if (quantity == '') {
            quantity = '0'
        }
        // อ่านข้อมูล database และส่งไปแสดงที่ card
        Product.find().exec((err, docs) => {

            Carousel.find().exec((err, carouselDoc) => {
                response.render('index', { logedIn: false, data: docs, qtyInCart: quantity, dataCarousel: carouselDoc })
            })
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
            email: form.email.toLowerCase() || '',
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
            .where('email').equals(email.toLowerCase())
            .exec((err, docs) => {
                if (!err) {
                    for (d of docs) {
                        emailDataBase = d.email
                        //console.log(emailDataBase, email)
                    }
                    if (emailDataBase == email.toLowerCase()) {
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
            .find().select('email password firstname lastname phoneNumber address city province zipcode') //addressOrder array pattern=(firstname, lastname, phoneNumber, address, city, province, zipcode)
            .where('email').equals(login.toLowerCase())
            .exec((err, docs) => {
                if (!err) {
                    for (d of docs) {

                        email = d.email
                        passwordCheck = d.password
                        firstname = d.firstname
                        lastname = d.lastname
                        phoneNumber = d.phoneNumber
                        address = d.address
                        city = d.city
                        province = d.province
                        zipcode = d.zipcode
                        //console.log(email, passwordCheck, firstname, lastname, phoneNumber, address, city, province, zipcode)
                    }

                    //ถ้าใส่ข้อมูลถูกต้อง

                    if (login.toLowerCase() == email.toLowerCase() && password == passwordCheck) {

                        //ถ้าเลือกให้จัดเก็บข้อมูลไว้ในเครื่อง ก็บันทึกเป็นคุกกี้
                        if (request.body.save) {
                            let age = 30 * 60 * 1000
                            response.cookie('login', login, { maxAge: age })
                            response.cookie('password', password, { maxAge: age })
                            response.cookie('save', saveCookie, { maxAge: age })

                            request.session.cookie.maxAge = age //กำหนดอายุของ session

                            //ถ้าไม่เลือกเก็บในเครื่อง แต่อาจมีคุกกี้เดิมเก็บไว้ ก็ให้ลบทิ้งไป
                        } else {
                            response.clearCookie('login')
                            response.clearCookie('password')
                            response.clearCookie('save')
                        }

                        //จัดเก็บข้อมูล login ไว้ในเซสชัน เพื่อใช้ตรวจสอบในภายหลัง
                        request.session.addressOrder = [firstname, lastname, phoneNumber, address, city, province, zipcode] //ถ้า log in แล้ว อ่านที่อยู่ส่งสินค้าเก็บใน session
                        request.session.login = login
                        request.session.firstname = firstname
                        logedIn = true
                        valid = true
                    } else {
                        logedIn = false
                        valid = false
                        firstname = ''
                        password = ''
                    }

                    response.render('login',
                        { login: firstname, password: password, save: saveCookie, logedIn: logedIn, valid: valid })


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
            response.redirect('/add-product')
        } else {
            response.render('admin777', { msg: 'user name หรือ password ไม่ถูกต้อง' })
        }
    }
})

// หน้า admin log-in สำหรับ update-product
app.all('/admin777/update-product', (request, response) => {

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
            response.redirect('/update-product')
        } else {
            response.render('admin777', { msg: 'user name หรือ password ไม่ถูกต้อง' })
        }
    }
})

// หน้า admin log-in สำหรับ delete-product
app.all('/admin777/delete-product', (request, response) => {

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
            response.redirect('/delete-product')
        } else {
            response.render('admin777', { msg: 'user name หรือ password ไม่ถูกต้อง' })
        }
    }
})

// หน้า admin log-in สำหรับ order-product
app.all('/admin777/order-product', (request, response) => {

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
            response.redirect('/order-product')
        } else {
            response.render('admin777', { msg: 'user name หรือ password ไม่ถูกต้อง' })
        }
    }
})

// หน้า admin log-in สำหรับ carousel-add
app.all('/admin777/carousel-add', (request, response) => {

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
            response.redirect('/carousel-add')
        } else {
            response.render('admin777', { msg: 'user name หรือ password ไม่ถูกต้อง' })
        }
    }
})

// หน้า admin log-in สำหรับ carousel-delete
app.all('/admin777/carousel-delete', (request, response) => {

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
            response.redirect('/carousel-delete')
        } else {
            response.render('admin777', { msg: 'user name หรือ password ไม่ถูกต้อง' })
        }
    }
})

// หน้า web management จัดการร้าน
app.all('/web-management', (request, response) => {

    response.clearCookie('keyWord1') // ลบ cookie
    response.clearCookie('keyWord2') // ลบ cookie
    response.clearCookie('keyWordIndex') // ลบ cookie
    response.clearCookie('statusOrderIndex') // ลบ cookie
    response.render('web-management')
})

// Log-out 

app.get('/admin-logout', (request, response) => {

    request.session.destroy((err) => { })

    response.redirect('/')
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

                const dir = 'public/product-images/'
                let fileNames = []  //เก็บชื่อของแต่ละไฟล์

                for (f of upfiles) {
                    let newfile = dir + f.name
                    let newName = f.name

                    while (fs.existsSync(newfile)) {
                        let oldName = f.name.split('.')
                        let r = Math.floor(Math.random() * 999999)
                        oldName[0] += '_' + r
                        newName = oldName.join('.')
                        newfile = dir + newName
                    }
                    fileNames.push(newName)

                    //picture resize

                    sharp(f.path)
                        .resize({
                            width: 800,
                            withoutEnlargement: false
                        })
                        .toFile(newfile, err => { })

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
        response.render('web-management') //ถ้าไม่ได้ทำการ login ให้เปิดหน้าทำการ login
    }

})

// อัพเดตรายการสินค้าใหม่
app.all('/update-product', (request, response) => {

    let searchProductCode = request.body.searchProductCode || '' //รับค่ารหัสสินค้า เพื่อทำการค้นหา
    let userName = request.session.userName || ''

    if (request.session.userName) {
        // response.render('add-product', { user: userName }) //ถ้า login แล้ว


        if (request.method == 'GET') {


            response.render('update-product', { user: userName, data: [''] })
            return
        }

        if (searchProductCode != '') {

            // อ่านข้อมูล database และนำไปแสดงที่ ช่องข้อมูลแต่ละช่อง
            Product.find({ productCode: new RegExp(searchProductCode, 'i') }).exec((err, docs) => {

                if (docs == '') { // ถ้า ไม่มีข้อมูลใน database ให้ docs = ว่าง

                    docs = ['']
                }
                response.render('update-product', { user: userName, data: docs })
            })
        } else { // ถ้า search = ว่าง ให้ data = ว่าง

            response.render('update-product', { user: userName, data: [''] })
        }
    } else {
        response.render('web-management') //ถ้าไม่ได้ทำการ login ให้เปิดหน้าทำการ login
    }

})

// text update in database
app.all('/text-update', (request, response) => {

    let productCode = request.body.productCode || ''
    let productName = request.body.name || ''
    let productPrice = request.body.price || ''

    let productRemain = request.body.productRemain || ''
    let productMainDescription = request.body.mainDescription || ''
    let productSubDescription = request.body.subDescription || ''

    if (request.session.userName) {

        Product
            .findOneAndUpdate({ productCode: new RegExp(productCode, 'i') }, {
                name: productName,
                price: productPrice,
                productRemain: productRemain,
                mainDescription: productMainDescription,
                subDescription: productSubDescription
            },
                { useFindAndModify: false })
            .exec(err => {
                if (!err) {
                    response.redirect('/update-product')
                }
            })
    }

})

// image update in database
app.all('/image-update', (request, response) => {


    let userName = request.session.userName || ''

    if (request.session.userName) {

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

            const dir = 'public/product-images/'
            let updateImage = fields.updateImage //ชื่อภาพที่จะทำการลบออก
            let fileDelete = dir + updateImage // ไฟล์เก่าที่จะทำการลบออก
            let fileNames = []  //เก็บชื่อของแต่ละไฟล์

            let productCode = fields.codeProduct // code product in hidden input


            for (f of upfiles) {
                let newfile = dir + f.name
                let newName = f.name

                while (fs.existsSync(newfile)) {
                    let oldName = f.name.split('.')
                    let r = Math.floor(Math.random() * 999999)
                    oldName[0] += '_' + r
                    newName = oldName.join('.')
                    newfile = dir + newName
                }
                fileNames.push(newName) // file name ที่เพิ่มเข้าไปใหม่

                //picture resize

                sharp(f.path)
                    .resize({
                        width: 800,
                        withoutEnlargement: false
                    })
                    .toFile(newfile, err => {

                        fs.unlink(fileDelete, function (err) {
                            if (err) { throw err }
                            //     console.log('file deleted!')
                        })
                    })

            }
            let listImage = ''
            if (productCode != undefined) {

                // อ่านข้อมูล database และนำไปแสดงที่ ช่องข้อมูลแต่ละช่อง
                Product.find({ productCode: new RegExp(productCode, 'i') }).exec((err, docs) => {

                    if (!err) {

                        for (d of docs) {
                            listImage = d.images
                        }
                        let arrListImage = listImage.split(',') //แยกรายชื่อรูปภาพเป็น array
                        // ถ้าใน database มีชื่อรูปภาพที่จะทำการอัพเดต ให้นำชื่อภาพใหม่ไปแทนที่่
                        for (i in arrListImage) {
                            if (arrListImage[i].includes(updateImage)) {
                                arrListImage[i] = fileNames[0]

                            }
                        }
                        let imgFile = arrListImage.join(',')
                        // นำ list ภาพใหม่ใส่ลงใน database
                        Product
                            .findOneAndUpdate({ productCode: new RegExp(productCode, 'i') }, {
                                images: imgFile,
                            },
                                { useFindAndModify: false })
                            .exec(err => {
                                if (!err) {
                                    response.redirect('/update-product')
                                }
                            })
                    }
                })

            }
            //response.render('update-product', { user: userName, data: [''] })
            //นำชื่อไฟล์มารวมเป็นสตริงเดียวกัน
            //let imgFiles = fileNames.join(',')
        })
    }

})

// ลบรายการสินค้าจาก database
app.all('/delete-product', (request, response) => {

    let searchProductCode = request.body.searchProductCode || '' //รับค่ารหัสสินค้า เพื่อทำการค้นหา
    let userName = request.session.userName || ''

    if (request.session.userName) {
        // response.render('add-product', { user: userName }) //ถ้า login แล้ว


        if (request.method == 'GET') {


            response.render('delete-product', { user: userName, data: [''] })
            return
        }

        if (searchProductCode != '') {

            // อ่านข้อมูล database และนำไปแสดงที่ ช่องข้อมูลแต่ละช่อง
            Product.find({ productCode: new RegExp(searchProductCode, 'i') }).exec((err, docs) => {

                if (docs == '') { // ถ้า ไม่มีข้อมูลใน database ให้ docs = ว่าง

                    docs = ['']
                }
                response.render('delete-product', { user: userName, data: docs })
            })
        } else { // ถ้า search = ว่าง ให้ data = ว่าง

            response.render('delete-product', { user: userName, data: [''] })
        }
    } else {
        response.render('web-management') //ถ้าไม่ได้ทำการ login ให้เปิดหน้าทำการ login
    }

})

// delete data product in database

app.all('/delete-data', (request, response) => {

    //let userName = request.session.userName || ''
    let productCode = request.body.productCode || ''

    if (request.session.userName) {


        const dir = 'public/product-images/'
        let listImage = ''

        Product.find({ productCode: new RegExp(productCode, 'i') }).exec((err, docs) => {

            if (!err) {
                //Read list image
                for (d of docs) {
                    listImage = d.images
                }
                let arrListImage = listImage.split(',') //แยกรายชื่อรูปภาพเป็น array
                // กำหนด directory ที่จะลบของแต่ละภาพและทำการลบออกจาก server
                for (i in arrListImage) {
                    let fileDelete = ''

                    fileDelete = dir + arrListImage[i]

                    fs.unlink(fileDelete, function (err) {
                        if (err) { throw err }
                        //     console.log('file deleted!')
                    })
                }

                // delect data in database
                Product
                    .findOneAndDelete({ productCode: new RegExp(productCode, 'i') }, { useFindAndModify: false })
                    .exec(err => {
                        if (!err) {
                            response.redirect('/delete-product')
                        }
                    })

            }

        })

    }

})

// เพิ่ม slide carousel
app.all('/carousel-add', (request, response) => {

    if (request.session.userName) {
        // response.render('add-product', { user: userName }) //ถ้า login แล้ว


        if (request.method == 'GET') {
            let userName = request.session.userName
            response.render('carousel-add', { user: userName })
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

                const dir = 'public/images/'
                let fileNames = []  //เก็บชื่อของแต่ละไฟล์

                for (f of upfiles) {
                    var newfile = dir + f.name
                    let newName = f.name

                    while (fs.existsSync(newfile)) {
                        let oldName = f.name.split('.')
                        let r = Math.floor(Math.random() * 999999)
                        oldName[0] += '_' + r
                        newName = oldName.join('.')
                        newfile = dir + newName
                    }
                    fileNames.push(newName)

                    //picture resize

                    sharp(f.path)
                        .resize({
                            width: 1920,
                            height: 800,
                            withoutEnlargement: false
                        })
                        .toFile(newfile, err => { })

                }

                //นำชื่อไฟล์มารวมเป็นสตริงเดียวกัน
                let imgFiles = fileNames.join(',')
                let data = {
                    productCode: fields.productCode,
                    images: imgFiles,
                    label: fields.mainDescription,
                    content: fields.subDescription,

                }

                // ตรวจสอบว่า product code มีอยู่หรือไม่ก่อน ทำการบันทึก

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
                                Carousel.create(data, err => {
                                    let r = (err) ? 'รหัสสินค้าซ้ำ' : 'ข้อมูลบันทึกแล้ว'
                                    if (r == 'รหัสสินค้าซ้ำ') {
                                        deleteImage(newfile)
                                    }
                                    response.render('carousel-add', { msg: r, user: userName })
                                })

                            } else {
                                deleteImage(newfile)
                                response.render('carousel-add', { msg: 'ไม่มีรายการสินค้านี้อยู่ ให้ทำการเพิ่มรายกายสินค้านี้ก่อน', user: userName })
                            }
                        }
                    })
            })
        }
    } else {
        response.render('web-management') //ถ้าไม่ได้ทำการ login ให้เปิดหน้าทำการ login
    }
    // ลบรูปภาพออก ถ้ายังไม่มีรายการนี้อยู่ หรือ มี error เกิดขึ้น
    function deleteImage(fileDelete) {
        fs.unlink(fileDelete, function (err) {
            if (err) { throw err }
            //     console.log('file deleted!')
        })
    }
})

// ลบรายการ carousel จาก database
app.all('/carousel-delete', (request, response) => {

    let searchProductCode = request.body.searchProductCode || '' //รับค่ารหัสสินค้า เพื่อทำการค้นหา
    let userName = request.session.userName || ''

    if (request.session.userName) {
        // response.render('add-product', { user: userName }) //ถ้า login แล้ว


        if (request.method == 'GET') {


            response.render('carousel-delete', { user: userName, data: [''] })
            return
        }

        if (searchProductCode != '') {

            // อ่านข้อมูล database และนำไปแสดงที่ ช่องข้อมูลแต่ละช่อง
            Carousel.find({ productCode: new RegExp(searchProductCode, 'i') }).exec((err, docs) => {

                if (docs == '') { // ถ้า ไม่มีข้อมูลใน database ให้ docs = ว่าง

                    docs = ['']
                }
                response.render('carousel-delete', { user: userName, data: docs })
            })
        } else { // ถ้า search = ว่าง ให้ data = ว่าง

            response.render('carousel-delete', { user: userName, data: [''] })
        }
    } else {
        response.render('web-management') //ถ้าไม่ได้ทำการ login ให้เปิดหน้าทำการ login
    }

})

// delete data carousel in database

app.all('/carousel-dataDelete', (request, response) => {

    //let userName = request.session.userName || ''
    let productCode = request.body.productCode || ''

    if (request.session.userName) {

        const dir = 'public/images/'

        Carousel.find({ productCode: new RegExp(productCode, 'i') }).exec((err, docs) => {
            if (!err) {
                //Read list image
                for (d of docs) {                           
                // กำหนด directory ที่จะลบของแต่ละภาพและทำการลบออกจาก server
                
                  let  fileDelete = dir + d.images

                    fs.unlink(fileDelete, function (err) {
                        if (err) { throw err }
                        //     console.log('file deleted!')
                    })  
                }

                // delect data in database
                Carousel
                    .findOneAndDelete({ productCode: new RegExp(productCode, 'i') }, { useFindAndModify: false })
                    .exec(err => {

                        if (!err) {

                            response.redirect('/carousel-delete')

                        }
                    })

            }

        })

    }
})

// ดูรายการสั่งสินค้าของลูกค้า
app.all('/order-product', (request, response) => {

    let searchAll = request.body.searchAll || '' //รับค่า keyword search all order เพื่อทำการค้นหา
    let searchBankID = request.body.searchBankID || '' //รับค่า keyword BankID เพื่อทำการค้นหา
    let searchOrderID = request.body.searchOrderID || '' //รับค่า keyword OrderID เพื่อทำการค้นหา
    let searchName = request.body.searchName || '' //รับค่า keyword Name เพื่อทำการค้นหา

    let searchDateStart = request.body.searchDateStart || '' //รับค่า keyword searchDateStart เพื่อทำการค้นหา
    let searchDateEnd = request.body.searchDateEnd || '' //รับค่า keyword searchDateEnd เพื่อทำการค้นหา

    let searchKeyWord1 = request.body.searchKeyWord1 || '' // รับค่า search keyword เพื่อจำไว้ใช้ sort data
    let searchKeyWord2 = request.body.searchKeyWord2 || '' // รับค่า search keyword เพื่อจำไว้ใช้ sort data
    let searchKeyWordIndex = request.body.searchKeyWordIndex || '' // รับค่า search keyword index เพื่อแยกว่ามาจากการ search แบบใด

    let keyWord1 = request.cookies.keyWord1 || '' // อ่านค่า keyword 1 จาก cookies
    let keyWord2 = request.cookies.keyWord2 || '' // อ่านค่า keyword 2 จาก cookies
    let keyWordIndex = request.cookies.keyWordIndex || '' // อ่านค่า keyword index จาก cookies
    let statusOrderIndex = request.cookies.statusOrderIndex || '' // อ่านค่า status order index จาก cookie

    var statusOrder = request.body.statusOrder || '' // รับค่าสถานะการส่งสินค้า

    let userName = request.session.userName || '' // admin log-in

    let dt = new Date(); let m = dt.getMonth() + 1; m = (m >= 10) ? m : '0' + m;
    let d = dt.getDate();
    d = (d >= 10) ? d : '0' + d;
    let today = `${dt.getFullYear()}-${m}-${d}`;

    if (request.session.userName) {
        // response.render('add-product', { user: userName }) //ถ้า login แล้ว

        if (request.method == 'GET') {
            
            response.clearCookie('keyWord1') // ลบ cookie
            response.clearCookie('keyWord2') // ลบ cookie
            response.clearCookie('keyWordIndex') // ลบ cookie
            response.clearCookie('statusOrderIndex') // ลบ cookie
            response.render('order-product', {
                user: userName,
                data: '',
                selectIndex: statusOrder,
                searchAll: searchAll,
                searchBankID: searchBankID,
                searchOrderID: searchOrderID,
                searchName: searchName,
                searchDateStart: today,
                searchDateEnd: today,
                dateCheck: 'true' // เข้าหน้านี้ครั้งแรก
            })
            return
        }
        if (searchKeyWordIndex == 'a' && searchKeyWord1 != '') { // a แทน search by bank ID
            searchBankID = searchKeyWord1

        } else if (searchKeyWordIndex == 'b' && searchKeyWord1 != '') { // b แทน search by order ID
            searchOrderID = searchKeyWord1
        } else if (searchKeyWordIndex == 'c' && searchKeyWord1 != '') { // c แทน search by customer name
            searchName = searchKeyWord1
        } else if (searchKeyWordIndex == 'e' && searchKeyWord1 != '') { // e แทน search all order

            searchAll = searchKeyWord1
            searchBankID = ''
            searchOrderID = ''
            searchName = ''
            searchDateStart = ''
            searchDateEnd = ''

        } else if (searchKeyWordIndex == 'd') { // d แทน search by date
            searchDateStart = searchKeyWord1
            searchDateEnd = searchKeyWord2
        }
        // รับค่าจาก cookie ถ้ากดกลับมาจาก หน้า order-description
        if (searchKeyWord1 == '' || statusOrder == '') {
            searchKeyWord1 = keyWord1
            searchKeyWord2 = keyWord2
            searchKeyWordIndex = keyWordIndex
            statusOrder = statusOrderIndex
        }


        if (searchBankID != '') {

            response.cookie('keyWord1', searchBankID) // สร้าง cookie จัดเก็บค่า keyWord1
            response.cookie('keyWord2', searchBankID) // สร้าง cookie จัดเก็บค่า keyWord1
            response.cookie('keyWordIndex', 'a') // สร้าง cookie จัดเก็บค่า keyWord index
            response.cookie('statusOrderIndex', statusOrder) // สร้าง cookie จัดเก็บค่า keyWord index

            if (statusOrder == 'all' || statusOrder == '') { // sort ด้วย bank ID status ทั้งหมด

                Order
                    .find({ bankID: new RegExp(searchBankID, 'i') })
                    .exec((err, docs) => {

                        response.render('order-product', {
                            user: userName,
                            data: docs,
                            selectIndex: statusOrder,
                            searchAll: searchAll,
                            searchBankID: searchBankID,
                            searchOrderID: searchOrderID,
                            searchName: searchName,
                            searchDateStart: today,
                            searchDateEnd: today,
                            dateCheck: 'false' // เคยเข้าหน้านี้แล้ว
                        })
                    })
            } else {

                Order
                    .find({ bankID: new RegExp(searchBankID, 'i') })
                    .where('statusOrder').equals(statusOrder)
                    .exec((err, docs) => {

                        response.render('order-product', {
                            user: userName,
                            data: docs,
                            selectIndex: statusOrder,
                            searchAll: searchAll,
                            searchBankID: searchBankID,
                            searchOrderID: searchOrderID,
                            searchName: searchName,
                            searchDateStart: today,
                            searchDateEnd: today,
                            dateCheck: 'false' // เคยเข้าหน้านี้แล้ว
                        })
                    })
            }

        } else if (searchOrderID != '') {

            response.cookie('keyWord1', searchOrderID) // สร้าง cookie จัดเก็บค่า keyWord1
            response.cookie('keyWord2', searchOrderID) // สร้าง cookie จัดเก็บค่า keyWord1
            response.cookie('keyWordIndex', 'b') // สร้าง cookie จัดเก็บค่า keyWord index
            response.cookie('statusOrderIndex', statusOrder) // สร้าง cookie จัดเก็บค่า keyWord index
            if (statusOrder == 'all' || statusOrder == '') { // sort ด้วย order ID status ทั้งหมด
                Order
                    .find({ orderID: new RegExp(searchOrderID, 'i') })
                    .exec((err, docs) => {

                        response.render('order-product', {
                            user: userName,
                            data: docs,
                            selectIndex: statusOrder,
                            searchAll: searchAll,
                            searchBankID: searchBankID,
                            searchOrderID: searchOrderID,
                            searchName: searchName,
                            searchDateStart: today,
                            searchDateEnd: today,
                            dateCheck: 'false' // เคยเข้าหน้านี้แล้ว
                        })
                    })
            } else {
                Order
                    .find({ orderID: new RegExp(searchOrderID, 'i') })
                    .where('statusOrder').equals(statusOrder)
                    .exec((err, docs) => {

                        response.render('order-product', {
                            user: userName,
                            data: docs,
                            selectIndex: statusOrder,
                            searchAll: searchAll,
                            searchBankID: searchBankID,
                            searchOrderID: searchOrderID,
                            searchName: searchName,
                            searchDateStart: today,
                            searchDateEnd: today,
                            dateCheck: 'false' // เคยเข้าหน้านี้แล้ว
                        })
                    })
            }
        } else if (searchName != '') {

            response.cookie('keyWord1', searchName) // สร้าง cookie จัดเก็บค่า keyWord1
            response.cookie('keyWord2', searchName) // สร้าง cookie จัดเก็บค่า keyWord1
            response.cookie('keyWordIndex', 'c') // สร้าง cookie จัดเก็บค่า keyWord index
            response.cookie('statusOrderIndex', statusOrder) // สร้าง cookie จัดเก็บค่า keyWord index
            if (statusOrder == 'all' || statusOrder == '') { // sort ด้วย customer name status ทั้งหมด
                Order
                    .find({ address: new RegExp(searchName, 'i') })
                    .exec((err, docs) => {

                        response.render('order-product', {
                            user: userName,
                            data: docs,
                            selectIndex: statusOrder,
                            searchAll: searchAll,
                            searchBankID: searchBankID,
                            searchOrderID: searchOrderID,
                            searchName: searchName,
                            searchDateStart: today,
                            searchDateEnd: today,
                            dateCheck: 'false' // เคยเข้าหน้านี้แล้ว
                        })
                    })
            } else {
                Order
                    .find({ address: new RegExp(searchName, 'i') })
                    .where('statusOrder').equals(statusOrder)
                    .exec((err, docs) => {

                        response.render('order-product', {
                            user: userName,
                            data: docs,
                            selectIndex: statusOrder,
                            searchAll: searchAll,
                            searchBankID: searchBankID,
                            searchOrderID: searchOrderID,
                            searchName: searchName,
                            searchDateStart: today,
                            searchDateEnd: today,
                            dateCheck: 'false' // เคยเข้าหน้านี้แล้ว
                        })
                    })
            }
        } else if (searchDateEnd != '') {
            response.cookie('keyWord1', searchDateStart) // สร้าง cookie จัดเก็บค่า keyWord1
            response.cookie('keyWord2', searchDateEnd) // สร้าง cookie จัดเก็บค่า keyWord1
            response.cookie('keyWordIndex', 'd') // สร้าง cookie จัดเก็บค่า keyWord index
            response.cookie('statusOrderIndex', statusOrder) // สร้าง cookie จัดเก็บค่า keyWord index
            if (statusOrder == 'all' || statusOrder == '') { // sort ด้วย date status ทั้งหมด
                Order
                    .find({ orderDate: { $gte: searchDateStart, $lte: searchDateEnd } })
                    .exec((err, docs) => {

                        response.render('order-product', {
                            user: userName,
                            data: docs,
                            selectIndex: statusOrder,
                            searchAll: searchAll,
                            searchBankID: searchBankID,
                            searchOrderID: searchOrderID,
                            searchName: searchName,
                            searchDateStart: searchDateStart,
                            searchDateEnd: searchDateEnd,
                            dateCheck: 'false' // เคยเข้าหน้านี้แล้ว
                        })
                    })
            } else {
                Order
                    .find({ orderDate: { $gte: searchDateStart, $lte: searchDateEnd } })
                    .where('statusOrder').equals(statusOrder)
                    .exec((err, docs) => {

                        response.render('order-product', {
                            user: userName,
                            data: docs,
                            selectIndex: statusOrder,
                            searchAll: searchAll,
                            searchBankID: searchBankID,
                            searchOrderID: searchOrderID,
                            searchName: searchName,
                            searchDateStart: searchDateStart,
                            searchDateEnd: searchDateEnd,
                            dateCheck: 'false' // เคยเข้าหน้านี้แล้ว
                        })
                    })
            }
        } else { // หาทั้งหมด
            response.cookie('keyWord1', searchAll) // สร้าง cookie จัดเก็บค่า keyWord1
            response.cookie('keyWord2', searchAll) // สร้าง cookie จัดเก็บค่า keyWord1
            response.cookie('keyWordIndex', 'e') // สร้าง cookie จัดเก็บค่า keyWord index
            response.cookie('statusOrderIndex', statusOrder) // สร้าง cookie จัดเก็บค่า keyWord index
            if (statusOrder == 'all' || statusOrder == '') { // sort status all

                Order
                    .find()
                    .exec((err, docs) => {

                        response.render('order-product', {
                            user: userName,
                            data: docs,
                            selectIndex: statusOrder,
                            searchAll: searchAll,
                            searchBankID: '',
                            searchOrderID: '',
                            searchName: '',
                            searchDateStart: today,
                            searchDateEnd: today,
                            dateCheck: 'false' // เคยเข้าหน้านี้แล้ว
                        })
                    })
            } else {

                Order
                    .find()
                    .where('statusOrder').equals(statusOrder)
                    .exec((err, docs) => {

                        response.render('order-product', {
                            user: userName,
                            data: docs,
                            selectIndex: statusOrder,
                            searchAll: searchAll,
                            searchBankID: '',
                            searchOrderID: '',
                            searchName: '',
                            searchDateStart: today,
                            searchDateEnd: today,
                            dateCheck: 'false' // เคยเข้าหน้านี้แล้ว
                        })
                    })
            }
        }

    } else {
        response.render('web-management') //ถ้าไม่ได้ทำการ login ให้เปิดหน้าทำการ login
    }

})

// รายละเอียดของการสั่งสินค้าและที่อยู่การจดส่งของลูกค้า

app.all('/order-description', (request, response) => {


    let orderID = request.body.orderID || '' // Recieve data order ID

    let keyWord1 = request.cookies.keyWord1 || '' // อ่านค่า keyword 1 จาก cookies
    let keyWord2 = request.cookies.keyWord2 || '' // อ่านค่า keyword 2 จาก cookies
    let keyWordIndex = request.cookies.keyWordIndex || '' // อ่านค่า keyword index จาก cookies
    let statusOrderIndex = request.cookies.statusOrderIndex || '' // อ่านค่า status index จาก cookies

    if (request.session.userName) {

        Order
            .find()
            .where('orderID').equals(orderID)
            .exec((err, docs) => {
                if (!err) {
                    var list
                    for (d of docs) {
                        list = d.orderList
                    }

                    response.render('order-description', {
                        data: docs,
                        list: list,
                        keyWord1: keyWord1,
                        keyWord2: keyWord2,
                        keyWordIndex: keyWordIndex,
                        statusOrderIndex: statusOrderIndex
                    })
                }
            })
    } else {
        response.render('web-management') //ถ้าไม่ได้ทำการ login ให้เปิดหน้าทำการ login
    }
})

// order update รายละเอียดการจัดส่งสินค้า

app.all('/update-order', (request, response) => {

    let postID = request.body.postID || '' // รับค่าหมายเลขพัสดุ
    let statusOrder = request.body.statusOrder || '' // รับค่าสถานะการส่งสินค้า

    let keyWord1 = request.cookies.keyWord1 || '' // อ่านค่า keyword 1 จาก cookies
    let keyWord2 = request.cookies.keyWord2 || '' // อ่านค่า keyword 2 จาก cookies
    let keyWordIndex = request.cookies.keyWordIndex || '' // อ่านค่า keyword index จาก cookies
    let statusOrderIndex = request.cookies.statusOrderIndex || '' // อ่านค่า status order index จาก cookie

    let orderID = request.body.orderID || '' // รับค่าหมายเลขสั่งสินค้า

    if (request.session.userName) {

        Order
            .findOneAndUpdate({ orderID: new RegExp(orderID, 'i') }, {
                postID: postID,
                statusOrder: statusOrder,

            },
                { useFindAndModify: false })
            .exec(err => {
                if (!err) {
                    Order
                        .find()
                        .where('orderID').equals(orderID)
                        .exec((err, docs) => {
                            if (!err) {
                                var list
                                for (d of docs) {
                                    list = d.orderList
                                }

                                response.render('order-description', {
                                    data: docs,
                                    list: list,
                                    keyWord1: keyWord1,
                                    keyWord2: keyWord2,
                                    keyWordIndex: keyWordIndex,
                                    statusOrderIndex: statusOrderIndex
                                })
                            }
                        })
                }
            })
    } else {
        response.render('web-management') //ถ้าไม่ได้ทำการ login ให้เปิดหน้าทำการ login
    }
})

// delete data order in database

app.all('/order-delete', (request, response) => {

    let orderID = request.body.orderID || ''

    let keyWord1 = request.cookies.keyWord1 || '' // อ่านค่า keyword 1 จาก cookies
    let keyWord2 = request.cookies.keyWord2 || '' // อ่านค่า keyword 2 จาก cookies
    let keyWordIndex = request.cookies.keyWordIndex || '' // อ่านค่า keyword index จาก cookies
    let statusOrderIndex = request.cookies.statusOrderIndex || '' // อ่านค่า status order index จาก cookie

    if (request.session.userName) {


        const dir = 'public/upload/'
        let listImage = ''

        Order.find({ orderID: new RegExp(orderID, 'i') }).exec((err, docs) => {

            if (!err) {
                //Read list image
                for (d of docs) {
                    listImage = d.images
                }
                let arrListImage = listImage.split(',') //แยกรายชื่อรูปภาพเป็น array

                // กำหนด directory ที่จะลบของแต่ละภาพและทำการลบออกจาก server
                for (i in arrListImage) {
                    let fileDelete = ''

                    fileDelete = dir + arrListImage[i]

                    fs.unlink(fileDelete, function (err) {
                        if (err) { throw err }
                        //     console.log('file deleted!')
                    })
                }

                // delect data in database
                Order
                    .findOneAndDelete({ orderID: new RegExp(orderID, 'i') }, { useFindAndModify: false })
                    .exec(err => {
                        if (!err) {
                            response.render('order-delete', {
                                msg: 'ลบรายการสั่งซื้อเรียบร้อยแล้ว',
                                keyWord1: keyWord1,
                                keyWord2: keyWord2,
                                keyWordIndex: keyWordIndex,
                                statusOrderIndex: statusOrderIndex
                            })
                        }
                    })

            }

        })

    } else {
        response.render('web-management') //ถ้าไม่ได้ทำการ login ให้เปิดหน้าทำการ login
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

// list สินค้าในรถเข็น ก่อนยืนยันสั่งซื้อ

app.all('/product-cart', (request, response) => {


    let userName = request.session.firstname || ''
    let listMainInCart = request.session.userID || []
    let listInCart = [] //เก็บ list รายการและจำนวนสินค้าในรถเข็น

    let productCodeDelete = request.body.itemCode || '' // อ่านค่า item code ที่จะลบ

    let productCode = request.body.productCode || ''
    let productName = request.body.productName || ''
    let productDescription = request.body.productDescription || ''
    let productPrice = request.body.productPrice || ''
    let qtyBuyProduct = request.body.qtyBuyProduct || ''
    let productImage = request.body.productImage || ''
    let productRemain = request.body.productRemain || ''

    let deleteItem = request.body.itemDelete || ''

    let orderNowClick = request.body.orderNow || '' //ถ้ากดปุ่มสั่งซื้อตอนนี้ ให้ทำการเพิ่ม list สินค้าที่จะสั่งเข้าไปด้วย

    let addressOrder = request.session.addressOrder || [] // เก็บข้อมูลที่อยู่ของ user
    let checkDataAddress = ''

    request.session.itemOrder = [] // clear data ใน session เมื่อกดกลับมาที่หน้านี้

    // กรณีผู้ใช้ยังไม่ได้ทำการ log-in

    if (!request.session.login) {

        //ถ้าเข้ามาแบบไม่ได้ log-in และ ทำการลบข้อมูลใน list
        if (deleteItem == 'itemDelete') {
            for (i in listMainInCart) {
                if (listMainInCart[i].includes(productCodeDelete)) {
                    listMainInCart.splice(i, 1)
                }
            }
            request.session.quantity = listMainInCart.length.toString() // update data quantity
        }

        if (addressOrder.length == 0) {
            checkDataAddress = 'false'
        } else {
            checkDataAddress = 'true'
        }

        //ถ้ากดปุ่มสั่งซื้อตอนนี้ ให้ทำการเพิ่ม list สินค้าที่จะสั่งเข้าไปด้วย
        if (orderNowClick == 'true') {
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

            request.session.quantity = listMainInCart.length.toString()
            request.session.userID = listMainInCart
        }

        response.render('products-InCart', { dataAddress: checkDataAddress, data: listMainInCart })

    } else {
        // กรณีผู้ใช้ได้ทำการ log-in แล้ว

        //ถ้าเข้ามาแบบ log-in แล้วและ ทำการลบข้อมูลใน list
        if (deleteItem == 'itemDelete') {
            for (i in listMainInCart) {
                if (listMainInCart[i].includes(productCodeDelete)) {
                    listMainInCart.splice(i, 1)
                }
            }
            request.session.quantity = listMainInCart.length.toString() // update data quantity
        }

        if (addressOrder.length == 0) {
            checkDataAddress = 'false'
        } else {
            checkDataAddress = 'true'
        }

        //ถ้ากดปุ่มสั่งซื้อตอนนี้ ให้ทำการเพิ่ม list สินค้าที่จะสั่งเข้าไปด้วย
        if (orderNowClick == 'true') {
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

            request.session.quantity = listMainInCart.length.toString()
            request.session.userID = listMainInCart
        }
        response.render('products-InCart', { logedIn: true, user: userName, dataAddress: checkDataAddress, data: listMainInCart })
    }
})

// กรอกที่อยู่สำหรับคนที่ไม่ใช่สมาชิก

app.all('/input-address', (request, response) => {

    let listMainInCart = request.session.userID || [] //array เก็บข้อมูลหลัก list รายการและจำนวนสินค้าในรถเข็น
    let dataQuantityListOrder = request.body.dataQuantityListOrder || '' //รับค่าจำนวนที่สั่งเพื่ออัพเดตใหม่ จากหน้าในรถเข็น

    let chooseItemOrder = request.body.chooseItemOrder || '' //รับค่าการเลือกรายการที่จะสั่งจาก check box ในรถเข็น
    let listItemOder = request.session.itemOrder || [] // อ่านค่าใน session ว่ามีรายการที่จะสั่งอะไรบ้าง หลังจาก เลือก check box ในรถเข็น

    if (dataQuantityListOrder != '') {

        let dataListArr = dataQuantityListOrder.split(',')
        for (i in listMainInCart) {
            if (listMainInCart[i][0] == dataListArr[0]) { //compare product code ตรงกันใน list หน้ารถเข็น

                listMainInCart[i][4] = dataListArr[1]
                dataListArr.splice(0, 2)
            }
        }

    }
    // สร้าง list ขึ้นใหม่จากการที่ผู้ใช้เลือกบางรายการจาก รายกายในรถเข็น ผ่าน checkbox
    if (chooseItemOrder != '') {
        listItemOder = []
        let dataListOrder = chooseItemOrder.split(',')
        for (c in listMainInCart) {
            if (listMainInCart[c].includes(dataListOrder[0])) {

                listItemOder.push(listMainInCart[c])
                dataListOrder.splice(0, 1)
            }
        }

        request.session.itemOrder = listItemOder
    }

    if (!request.session.login) {

        response.render('input-address')

    }
})

// หลังจากกรอกที่อยู่สำหรับผู้ที่ไม่ได้เป็นสมาชิก หรือ คนที่เป็นสามาชิกแล้ว

app.all('/order-confirm', (request, response) => {

    let addressOrder = request.session.addressOrder || [] // เก็บข้อมูลที่อยู่ของ user
    let editAddress = request.body.editAddress || ''

    let firstname = request.body.firstname || ''
    let lastname = request.body.lastname || ''
    let phoneNumber = request.body.phoneNumber || ''
    let address = request.body.address || ''
    let city = request.body.city || ''
    let province = request.body.province || ''
    let zipcode = request.body.zipcode || ''

    let listMainInCart = request.session.userID || [] //array เก็บข้อมูลหลัก list รายการและจำนวนสินค้าในรถเข็น
    let dataQuantityListOrder = request.body.dataQuantityListOrder || '' //รับค่าจำนวนที่สั่งเพื่ออัพเดตใหม่ จากหน้าในรถเข็น

    let chooseItemOrder = request.body.chooseItemOrder || '' //รับค่าการเลือกรายการที่จะสั่งจาก check box ในรถเข็น
    let listItemOder = request.session.itemOrder || [] // อ่านค่าใน session ว่ามีรายการที่จะสั่งอะไรบ้าง หลังจาก เลือก check box ในรถเข็น

    if (dataQuantityListOrder != '') {

        let dataListArr = dataQuantityListOrder.split(',')
        for (i in listMainInCart) {
            if (listMainInCart[i][0] == dataListArr[0]) { //compare product code ตรงกันใน list หน้ารถเข็น

                listMainInCart[i][4] = dataListArr[1]
                dataListArr.splice(0, 2)
            }
        }

    }

    // สร้าง list ขึ้นใหม่จากการที่ผู้ใช้เลือกบางรายการจาก รายกายในรถเข็น ผ่าน checkbox
    if (chooseItemOrder != '') {
        listItemOder = []
        let dataListOrder = chooseItemOrder.split(',')
        for (c in listMainInCart) {
            if (listMainInCart[c].includes(dataListOrder[0])) {

                listItemOder.push(listMainInCart[c])
                dataListOrder.splice(0, 1)
            }
        }
        request.session.itemOrder = listItemOder
    }

    //สำหรับคนที่ไม่ได้เป็นสมาชิก
    if (!request.session.login) {

        if (!request.body.firstname && !request.session.addressOrder) {
            response.render('input-address')
        } else {
            if (addressOrder.length == 0) {
                addressOrder.push(firstname, lastname, phoneNumber, address, city, province, zipcode)
                request.session.addressOrder = addressOrder

            } else if (editAddress == 'editAddress') { //ถ้ามีการแก้ไขข้อมูลที่อยู่

                addressOrder = [] // clear data
                addressOrder.push(firstname, lastname, phoneNumber, address, city, province, zipcode)
                request.session.addressOrder = addressOrder
            }
            response.render('order-confirm', { data: listItemOder, dataAddress: addressOrder })
        }
    }
    //สำหรับคนที่เป็นสมาชิกและ log in แล้ว 
    else {
        if (editAddress == 'editAddress') { //ถ้ามีการแก้ไขข้อมูลที่อยู่

            addressOrder = [] // clear data
            addressOrder.push(firstname, lastname, phoneNumber, address, city, province, zipcode)
            request.session.addressOrder = addressOrder
        }
        response.render('order-confirm', { data: listItemOder, dataAddress: addressOrder })
    }
})

// แก้ไขข้อมูลที่อยู่การจัดส่ง

app.all('/edit-address', (request, response) => {

    let addressOrder = request.session.addressOrder || [] // เก็บข้อมูลที่อยู่ของ user


    response.render('edit-address', { dataAddress: addressOrder })


})

// ยืนยันการสั่งสินค้า เลือกวิธีชำระเงิน อัพโหลดสลิป

app.all('/buy-products', (request, response) => {

    let addressOrder = request.session.addressOrder || [] // เก็บข้อมูลที่อยู่ของ user
    let grandPriceOrder = request.body.grandPriceOrder || '' //รับค่าราคาทั้งหมดที่ทำการสั่งซื้อ
    let cashMethod = request.body.cashMethod || '' // รับค่าข้อมูลช่องทางการชำระเงิน


    //สำหรับคนที่ไม่ได้เป็นสมาชิก
    if (!request.session.login) {

        if (!request.session.addressOrder) { //ยังไม่ได้กรอกข้อมูลที่อยู่
            response.render('input-address')
        } else if (grandPriceOrder == '') {
            response.render('products-InCart')
        }
        else {

            request.session.cost = grandPriceOrder
            response.render('buy-products', { dataAddress: addressOrder, dataGrandPrice: grandPriceOrder, dataCashMethod: cashMethod })

        }
    } else { // เป็นสมาชิกแล้ว
        if (grandPriceOrder == '') {
            response.render('products-InCart')
        } else {
            request.session.cost = grandPriceOrder
            response.render('buy-products', { dataAddress: addressOrder, dataGrandPrice: grandPriceOrder, dataCashMethod: cashMethod })
        }
    }
})

// แก้ไขที่อยู่

app.all('/edit-address', (request, response) => {

    let addressOrder = request.session.addressOrder || [] // เก็บข้อมูลที่อยู่ของ user


    response.render('edit-address', { dataAddress: addressOrder })


})

// ยืนยันการสั่งสินค้า เลือกวิธีชำระเงิน อัพโหลดสลิป

app.all('/order', (request, response) => {

    let addressOrder = request.session.addressOrder || [] // เก็บข้อมูลที่อยู่ของ user
    let listItemOder = request.session.itemOrder || [] // อ่านค่าใน session ว่ามีรายการที่จะสั่งอะไรบ้าง หลังจาก เลือก check box ในรถเข็น
    let cost = request.session.cost || '' // อ่านค่าราคารวมที่ต้องจ่าย



    let form = new formidable.IncomingForm({ multiples: true })
    form.parse(request, (err, fields, files) => {

        let upfiles = files.upfiles
        if (!Array.isArray(files.upfiles)) {
            if (files.upfiles.name == '') {  //ถ้าไม่ได้เลือกไฟล์
                response.render('buy-products', { dataAddress: addressOrder, dataGrandPrice: cost })
                return
            } else {		                //ถ้าเลือกไฟล์เดียว
                upfiles = [files.upfiles]
            }
        }
        const dir = 'public/upload/'

        if (!err) {
            if (listItemOder != '') {

                // เตรียมข้อมูลเขียนลง database
                let bankID = fields.bankID4Digit
                let orderDatabaseID = ''
                let orderID = ''
                let orderIDCheck = 0

                //ตรวจสอบว่ามี orderID ซ้ำกันหรือไม่ ถ้าซ้ำให้สุ่มเลข ID ใหม่

                orderID = bankID + '-' + Math.floor(Math.random() * 999999)

                Order
                    .find()
                    .exec((err, docs) => {
                        do {
                            orderIDCheck = 0
                            for (d of docs) {
                                orderDatabaseID = d.orderID
                                if (orderID == orderDatabaseID) {
                                    orderID = bankID + '-' + Math.floor(Math.random() * 9999999)
                                    orderIDCheck = 1
                                }
                            }
                        } while (orderIDCheck == 1)

                        //upload picture to server
                        for (f of upfiles) {
                            let newfile = dir + f.name
                            var newName = f.name

                            while (fs.existsSync(newfile)) {
                                let oldName = f.name.split('.')
                                let r = Math.floor(Math.random() * 999999)
                                oldName[0] += '_' + r
                                newName = oldName.join('.')
                                newfile = dir + newName
                            }

                            sharp(f.path)
                                .resize({ width: 512, withoutEnlargement: false })
                                .toFile(newfile, err => {
                                })
                        }

                        //let listOrder = listItemOder.join(',')
                        let address = addressOrder.join(',')

                        let data = {
                            orderID: orderID,
                            bankID: bankID,
                            orderDate: fields.date,
                            orderTime: fields.time,
                            cost: cost,
                            address: address,
                            images: newName,
                            orderList: listItemOder,
                            statusOrder: 'ต้องจัดส่ง',
                            postID: '-',
                        }

                        Order
                            .create(data)
                            .then(() => {

                                request.session.userID = [] //clear list order หลังจากยืนยันการสั่งเรียบร้อยแล้ว
                                request.session.itemOrder = [] //clear list order หลังจากยืนยันการสั่งเรียบร้อยแล้ว
                                request.session.quantity = '0'

                                response.render('order-complete', { orderID: orderID })
                            })

                    })

            } else {
                response.redirect('/')
            }

        }

    })
    //console.log(form)
    // var transporter = nodemailer.createTransport({
    //     service: 'outlook',
    //     auth: {
    //         user: process.env.AUTH_EMAIL || 'teerayut7723@outlook.com',
    //         pass: process.env.AUTH_PASS || 'aaa@12345'
    //     },
    //     tls: {
    //         // do not fail on invalid certs
    //         rejectUnauthorized: false,
    //     },
    // });
    // var test = 77777
    // var mailOptions = {
    //     from: 'teerayut7723@outlook.com',
    //     to: 'teerayut7723@gmail.com',
    //     subject: 'Sending Email using Node.js 777',
    //     //text: 'That was easy!'
    //     //html: '<h1>Welcome</h1><p>That was easy!</p>',
    //     //html: '<div><h2>test text </h2></div> <img src="cid:777@create.ee"/>' + '<div>' + test + '</div>',
    //     html: '<div><h2>test text </h2></div>' + '<div>' + test + '</div>',
    //     attachments: [{
    //         'filename': newName,
    //         path: newfile,
    //         //'content': upfile.path,
    //         //'cid': '777@create.ee' //same cid value as in the html img src
    //     }]
    // };

    // transporter.sendMail(mailOptions, function (error, info) {
    //     //     if (error) {
    //     //         console.log(error);
    //     //     } else {
    //     //         console.log('Email sent: ' + info.response);
    //     //     }
    // });

})


// ค้นหาสินค้า

app.all('/search', (request, response) => {

    let listMainInCart = request.session.userID || [] //array เก็บข้อมูลหลัก list รายการและจำนวนสินค้าในรถเข็น
    let dataQuantityList = request.body.dataQuantityList || '' //รับค่าจำนวนที่สั่งเพื่ออัพเดตใหม่ จากหน้าในรถเข็น

    let search = request.body.search || '' // รับค่า keyword สำหรับค้นหาข้อมูล

    request.session.itemOrder = [] // clear data ใน session เมื่อกดกลับมาที่หน้านี้


    if (dataQuantityList != '') {

        let dataListArr = dataQuantityList.split(',')
        for (i in listMainInCart) {
            if (listMainInCart[i][0] == dataListArr[0]) { //compare product code ตรงกันใน list หน้ารถเข็น

                listMainInCart[i][4] = dataListArr[1]
                dataListArr.splice(0, 2)
            }
        }

    }

    if (request.session.login) { // อ่านค่าใน session
        let userName = request.session.firstname || ''
        let quantity = request.session.quantity || ''

        if (quantity == '') {
            quantity = '0'
        }

        // อ่านข้อมูล database และส่งไปแสดงที่ card กรณีทำการ log-in แล้ว
        Product.find({ name: new RegExp(search, 'i') }).exec((err, docs) => {
            response.render('index', { logedIn: true, user: userName, data: docs, qtyInCart: quantity })
        })
        //ถ้าไม่ได้ log-in
    } else {
        let quantity = request.session.quantity || ''
        if (quantity == '') {
            quantity = '0'
        }
        // อ่านข้อมูล database และส่งไปแสดงที่ card
        Product.find({ name: new RegExp(search, 'i') }).exec((err, docs) => {

            response.render('index', { logedIn: false, data: docs, qtyInCart: quantity })
        })

    }

})

app.listen(port, () => console.log('Server started on port: 3000'))