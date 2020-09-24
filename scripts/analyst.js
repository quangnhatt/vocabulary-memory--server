$(function () {
  function formatCurrency(num, decimals = 2, delimiter = ',') {
    let toFixedDecimals = decimals != 0 ? decimals : 2;
    let newNum = (+num).toFixed(toFixedDecimals).replace(/\d(?=(\d{3})+\.)/g, '$&' + delimiter);
    if (decimals == 0) {
      newNum = newNum.substring(0, newNum.length - 3);
    }
    return newNum;
  }

  $('#analyst-btn').click(function () {
    $('#analyst-table').DataTable({
      destroy: true,
      responsive: true,
      scrollCollapse: true,
      scrollY: 500,
      scrollX: true,
      ajax: {
        type: "GET",
        url: "http://localhost:3001/api/v1/analyst",
        dataSrc: function (res) {
          return res;
        }
      },
      dataSrc: function (res) {
        let return_data = new Array();
        if (!res || res.length == 0) return return_data;
        let data = res;
        for (var i = 0; i < data.length; i++) {
          data[i].upBullishEngulfing = data[i].upBullishEngulfing.join(' | ');
          data[i].upHammer = data[i].upHammer.join(' | ');
          data[i].upInvertedHammer = data[i].upInvertedHammer.join(' | ');
          data[i].upMorningStar = data[i].upMorningStar.join(' | ');
          return_data.push(data[i]);
        }
        return return_data;
      },
      columns: [{
          'title': 'Code',
          'data': 'code'
        },
        {
          'title': 'VOL: 1/7',
          'data': 'volumesLast1Per7Sessions'
        },
        {
          'title': 'VOL: 7/14',
          'data': 'volumesLast7Per14Sessions'
        },
        {
          'title': 'VOL: 7/30',
          'data': 'volumesLast7Per30Sessions'
        },
        {
          'title': 'VOL: 7/90',
          'data': 'volumesLast7Per90Sessions'
        },
        {
          'title': 'VOL: 7/120',
          'data': 'volumesLast7Per120Sessions'
        },
        {
          'title': 'VOL: 1s',
          'data': 'volumesLastSession'
        },
        {
          'title': 'VOL: 7s',
          'data': 'volumesLast7Sessions'
        },
        {
          'title': 'VOL: 14s',
          'data': 'volumesLast14Sessions'
        },
        {
          'title': 'VOL: 30s',
          'data': 'volumesLast30Sessions'
        },
        {
          'title': 'VOL: 90s',
          'data': 'volumesLast90Sessions'
        },
        {
          'title': 'VOL: 120s',
          'data': 'volumesLast120Sessions'
        },
        {
          'title': 'Bullish Engulfing',
          'data': 'upBullishEngulfing'
        },
        {
          'title': 'Hammer',
          'data': 'upHammer'
        },
        {
          'title': 'Inverted Hammer',
          'data': 'upInvertedHammer'
        },
        {
          'title': 'Morning Star',
          'data': 'upMorningStar'
        }
      ],
      "columnDefs": [{
        "visible": false,
        "targets": 0
      }],
      rowCallback: function (row, data, index) {

      },
      displayLength: 25,
      drawCallback: function (settings) {
        let api = this.api();
        let rows = api.rows({
          page: 'current'
        }).nodes();
        let stockCodes = [];
        let last = null;
        api.column(0, {
          page: 'current'
        }).data().each(function (group, i) {
          if (last !== group) {
            stockCodes.push(group);
            $(rows).eq(i).before(
              '<tr class="group" id="group-' + group + '">' +
              '<td><strong><a target="_blank" href="https://finance.vietstock.vn/' + group + '/phan-tich-ky-thuat.htm">' + group + '</a></strong><span style="color:red" class="status"></span></td>' +
              '<td colspan="15" class="info"></td></tr>'
            );

            last = group;
          }
        });


        // getStockInfo(stockCodes);
      }
    });
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