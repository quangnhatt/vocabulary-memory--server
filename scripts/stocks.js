$(function () {
  // Simple Data Table

  function formatCurrency(num, decimals = 2, delimiter = ',') {
    let toFixedDecimals = decimals != 0 ? decimals : 2;
    let newNum = (+num).toFixed(toFixedDecimals).replace(/\d(?=(\d{3})+\.)/g, '$&' + delimiter);
    if (decimals == 0) {
      newNum = newNum.substring(0, newNum.length - 3);
    }
    return newNum;
  }


  $('#my-stock-table').DataTable({
    responsive: true,
    ajax: {
      type: "GET",
      beforeSend: function (request) {
        // request.setRequestHeader("token-id", token);
      },
      url: "http://localhost:3001/api/v1/assets",
      dataSrc: function (res) {
        let return_data = new Array();
        if (!res || res.length == 0) return return_data;
        let data = res;
        for (var i = 0; i < data.length; i++) {
          let costPrice = (data[i].costPrice / 1000).toFixed(3);
          let currentPrice = (data[i].currentPrice / 1000).toFixed(3);
          let interest = ((currentPrice - costPrice) / costPrice * 100).toFixed(2);
          let interestAmount = (data[i].quantity * (currentPrice - costPrice)).toFixed(3);
          return_data.push({
            'code': data[i].symbol,
            'quantity': data[i].quantity,
            'costPrice': costPrice,
            'currentPrice': currentPrice,
            'interest': interest + '%',
            'interestAmount': interestAmount
          })
        }
        return return_data;
      }
    },
    columns: [{
        'title': 'Code',
        'data': 'code'
      },
      {
        'title': 'Quantity',
        'data': 'quantity'
      },
      {
        'title': 'Cost Price',
        'data': 'costPrice'
      },
      {
        'title': 'Current Price',
        'data': 'currentPrice'
      },
      {
        'title': 'Interest',
        'data': 'interest'
      },
      {
        'title': 'Interest Amount',
        'data': 'interestAmount'
      }
    ],
    'rowCallback': function (row, data, index) {
      if (+data['interestAmount'] < 0) {
        $(row).find('td:eq(4)').css('color', 'red');
        $(row).find('td:eq(5)').css('color', 'red');
      } else if (+data['interestAmount'] > 0) {
        $(row).find('td:eq(4)').css('color', 'blue');
        $(row).find('td:eq(5)').css('color', 'blue');
      }
    },
    "footerCallback": function (row, data, start, end, display) {
      var api = this.api(),
        data;
      let costTotal = 0;
      let currentTotal = 0;
      let interestTotal = 0;
      for (let i = 0; i < data.length; i++) {
        costTotal += data[i].quantity * (+data[i].costPrice);
        currentTotal += data[i].quantity * (+data[i].currentPrice);
        interestTotal += (+data[i].interestAmount);
      }

      // Update footer
      $(api.column(2).footer()).html(
        '<strong>' + formatCurrency(costTotal.toFixed(3), 3, '.') + '</strong>'
      );
      $(api.column(3).footer()).html(
        '<strong>' + formatCurrency(currentTotal.toFixed(3), 3, '.') + '</strong>'
      );
      $(api.column(5).footer()).html(
        '<strong>' + formatCurrency(interestTotal.toFixed(3), 3, '.') + '</strong>'
      );
    }

  });

  $('#my-histories-table').DataTable({
    "responsive": true,
    scrollY: '50vh',
    scrollCollapse: true,
    ajax: {
      type: "GET",
      url: "http://localhost:3001/api/v1/histories",
      dataSrc: function (res) {
        return res;
      }
    },
    columns: [{
        'title': 'Code',
        'data': 'symbol'
      },
      {
        'title': 'Date',
        'data': 'execDate'
      },
      {
        'title': 'Type',
        'data': 'execType'
      },
      {
        'title': 'Quantity',
        'data': 'execQuantity'
      },
      {
        'title': 'Price',
        'data': 'execPrice'
      },
      {
        'title': 'Amount',
        'data': 'execAmount'
      },
      {
        'title': 'VN - HNX Index',
        'data': 'marketIndex'
      }
    ],
    "columnDefs": [{
      "visible": false,
      "targets": 0
    }],
    // "order": [
    //   [2, 'asc']
    // ],
    'rowCallback': function (row, data, index) {
      let execType = $(row).find('td:eq(1)').text();
      if (execType == 'NS') {
        $(row).find('td').css('color', 'blue');
      }
      $(row).find('td:eq(3)').text(formatCurrency($(row).find('td:eq(3)').text(), 0));
      $(row).find('td:eq(4)').text(formatCurrency($(row).find('td:eq(4)').text(), 0));
    },
    "displayLength": 25,
    "drawCallback": function (settings) {
      var api = this.api();
      var rows = api.rows({
        page: 'current'
      }).nodes();
      var last = null;
      api.column(0, {
        page: 'current'
      }).data().each(function (group, i) {
        if (last !== group) {
          $(rows).eq(i).before(
            '<tr class="group" id="group-' + group + '">' +
            '<td><strong>' + group + '</strong><span style="color:red" class="status"></span></td>' +
            '<td colspan="5" class="info"></td></tr>'
          );

          last = group;
        }
      });

      let data = api.data();
      if (data && data.length > 0) {
        let stockCodes = [];
        for (let index = 0; index < data.length; index++) {
          if (stockCodes.indexOf(data[index].symbol) == -1)
            stockCodes.push(data[index].symbol)
        }
        getStockInfo(stockCodes);
      }
    }
  });

  function getStockInfo(stockCodes) {
    $.ajax({
      url: "http://localhost:3001/api/v1/stock-info?stockCodes=" + stockCodes.join(),
      type: 'GET',
      dataType: 'json',
      success: function (res) {
        console.log(res);
        for (let index = 0; index < res.length; index++) {
          const item = res[index];
          if (item.StockStatus) {
            $('#group-' + item.StockCode + ' .status').text('-' + item.StockStatus);
          }
          let priceColor = '#6b6f82';
          if (item.Change > 0) {
            priceColor = 'rgb(57, 202, 50)'
          } else if (item.Change < 0) {
            priceColor = 'red';
          }
          let info = '<strong>Cur. Price</strong> <span style="color: ' + priceColor + '">' + formatCurrency(item.LastPrice, 0) + '</span>';
          info += '<span style="color: ' + priceColor + '">(' + item.Change + ') </span>' + '&emsp;';
          info += '<strong>Avr. Price</strong> ' + formatCurrency(item.AvrPrice, 0) + '&emsp;';
          info += '<strong>52W </strong> ' + formatCurrency(item.Min52W, 0) + ' - ' + formatCurrency(item.Max52W, 0) + '&emsp;&emsp;';
          info += '<strong>BVPS</strong> ' + formatCurrency(item.BVPS, 0) + '&emsp;&emsp;';
          info += '<strong>EPS</strong> ' + formatCurrency(item.EPS, 0) + '&emsp;&emsp;';
          info += '<strong>PE</strong> ' + formatCurrency(item.PE, 0) + '&emsp;&emsp;';
          $('#group-' + item.StockCode + ' .info').html(info);
        }
      }
    });
  }

  $.ajax({
    url: "http://localhost:3001/api/v1/market-price",
    type: 'GET',
    dataType: 'json', // added data type
    success: function (res) {
      let hose = res.find(x => x.Code == 'VNIndex');
      $('.current-vn-index').text(hose.Price).css('color', hose.Color);
      $('.current-vn-index-change').text('(' + hose.Change + ')').css('color', hose.Color);
      let hnx = res.find(x => x.Code == 'HNXINDEX');
      $('.current-hnx-index').text(hnx.Price).css('color', hnx.Color);
      $('.current-hnx-index-change').text('(' + hnx.Change + ')').css('color', hnx.Color);
    }
  });

})