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

  let grouppedHistories;
  $('#my-histories-table').DataTable({
    "responsive": true,
    scrollY: '50vh',
    scrollCollapse: true,
    ajax: {
      type: "GET",
      url: "http://localhost:3002/api/v1/histories",
      dataSrc: function (res) {
        debugger
        grouppedHistories = res.grouppedHistories;

        let totalProfit = 0;
        for(let i=0; i< grouppedHistories.length; i ++){
          totalProfit += grouppedHistories[i].profit;
        }
        $(".total-profit").html(formatCurrency(totalProfit, 0))
        return res.histories;
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
    "displayLength": 500,
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
          let item = grouppedHistories.find(x => x.symbol == group);
          $(rows).eq(i).before(
            '<tr class="group" id="group-' + group + '">' +
            '<td><strong>' + group + '</strong>&emsp;<span style="color: blue">'+ formatCurrency(item.profit, 0) +'</span><span style="color:red" class="status"></span></td>' +
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
        //getStockInfo(stockCodes);
      }

    }
  });

  function getStockInfo(stockCodes) {
    $.ajax({
      url: "http://localhost:3002/api/v1/stock-info?stockCodes=" + stockCodes.join(),
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

  // $.ajax({
  //   url: "http://localhost:3002/api/v1/market-price",
  //   type: 'GET',
  //   dataType: 'json', // added data type
  //   success: function (res) {
  //     let hose = res.find(x => x.Code == 'VNIndex');
  //     $('.current-vn-index').text(hose.Price).css('color', hose.Color);
  //     $('.current-vn-index-change').text('(' + hose.Change + ')').css('color', hose.Color);
  //     let hnx = res.find(x => x.Code == 'HNXINDEX');
  //     $('.current-hnx-index').text(hnx.Price).css('color', hnx.Color);
  //     $('.current-hnx-index-change').text('(' + hnx.Change + ')').css('color', hnx.Color);
  //   }
  // });

})