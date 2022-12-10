// ตรวจสอบเลขพัสดุ และนำไปแสดงในเพจ
function dataCheck() {

    let postNumber = document.getElementById('postNumber')
    let postID = document.getElementById('postID')

    let orderID = document.getElementById('orderID')
    let productOrderID = document.getElementById('productOrderID')

    postID.value = postNumber.value

    orderID.value = productOrderID.value
}

// update order click

function orderUpdate() {

    let formStatus = document.getElementById('formStatus')

    formStatus.action = '/update-order'
}

// delete order click

function deleteOrder() {

    let formStatus = document.getElementById('formStatus')

    if (confirm('ต้องการลบรายการนี้หรือไม่') == true) {
        formStatus.action = '/order-delete'
    }


}
