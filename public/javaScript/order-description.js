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

/* <input type="text" id="searchKeyWordIndex" name="searchKeyWordIndex" value="<%= keyWordIndex %>">
    <input type="text" id="searchKeyWord1" name="searchKeyWord1" value="<%= keyWord1 %>">
        <input type="text" id="searchKeyWord2" name="searchKeyWord2" value="<%= keyWord2 %>">
            <input type="text" id="statusOrderIndex" name="statusOrderIndex" value="<%= statusOrderIndex %>">   */