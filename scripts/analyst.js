// const HOST = "http://13.250.12.28:3001/"
const HOST = "http://localhost:3001/";

$(document).change(function () {});
$(function () {
  $.ajax({
    url: HOST + "api/v1/industries",
    type: "GET",
    dataType: "json",
    success: function (res) {
      console.log(res);
      for (let index = 0; index < res.length; index++) {
        const industry = res[index];
        $("#industry").append(
          $("<option>", {
            value: industry.ID,
            text: industry.Name,
          })
        );
      }

      $("#industry").formSelect();
    },
  });
  function formatCurrency(num, decimals = 2, delimiter = ",") {
    let toFixedDecimals = decimals != 0 ? decimals : 2;
    let newNum = (+num)
      .toFixed(toFixedDecimals)
      .replace(/\d(?=(\d{3})+\.)/g, "$&" + delimiter);
    if (decimals == 0) {
      newNum = newNum.substring(0, newNum.length - 3);
    }
    return newNum;
  }

  $("#analyst-table tfoot th").each(function () {
    var title = $(this).text();
    $(this).html('<input type="text" placeholder="Search ' + title + '" />');
  });

  $("#analyst-btn").click(function () {
    $(this).prop("disabled", true);
    $(this).text("Please wait, analyzing...");
    const catID = $("#board").val();
    const industryID = $("#industry").val();
    const peMax = $("#pe").val();
    const epsMin = $("#eps").val();
    const volumeMin = $("#volumeMin").val();
    const volumeMax = $("#volumeMax").val();
    const closePriceMin = $("#closePriceMin").val();
    const closePriceMax = $("#closePriceMax").val();
    const closePriceRateMin = $("#closePriceRateMin").val();
    const closePriceRateMax = $("#closePriceRateMax").val();
    const days = $("#days").val();
    const analystURL =
      HOST +
      "api/v1/analyst?catID=" +
      catID +
      "&industryID=" +
      industryID +
      "&peMax=" +
      peMax +
      "&epsMin=" +
      epsMin +
      "&volumeMin=" +
      volumeMin +
      "&volumeMax=" +
      volumeMax +
      "&closePriceMin=" +
      closePriceMin +
      "&closePriceMax=" +
      closePriceMax +
      "&days=" +
      days +
      "&closePriceRateMin=" +
      closePriceRateMin +
      "&closePriceRateMax=" +
      closePriceRateMax;

    $("#analyst-table").DataTable({
      initComplete: function () {
        // Apply the search
        this.api()
          .columns()
          .every(function () {
            var that = this;

            $("input", this.footer()).on("keyup change clear", function () {
              if (that.search() !== this.value) {
                that.search(this.value).draw();
              }
            });
          });
      },
      destroy: true,
      responsive: true,
      scrollCollapse: true,
      scrollY: 500,
      scrollX: true,
      ajax: {
        type: "GET",
        url: analystURL,
        dataSrc: function (res) {
          $("#analyst-btn").text("Analyze");
          $("#analyst-btn").prop("disabled", false);
          return res;
        },
      },
      dataSrc: function (res) {
        let return_data = new Array();
        if (!res || res.length == 0) return return_data;
        let data = res;
        return data;
      },
      columns: [
        {
          title: "Code",
          data: "code",
          render: function (data, type, row) {
            const str =
              '<a target="_blank" href="https://finance.vietstock.vn/' +
              data +
              '/phan-tich-ky-thuat.htm">' +
              data +
              "</a>";
            return str;
          },
        },
        {
          title: "-0d Price",
          data: "lastPrice",
        },
        {
          title: "-(x)d Price",
          data: "lastXPrice",
        },
        {
          title: "GR: 1/(x)",
          data: "rateClosePriceLast1andX",
        },
        {
          title: "VOL Break",
          data: "isAccumulatedStock",
          render: function (data) {
            if (data) return "Yes";
            return "No";
          },
        },
        {
          title: "VOL: 1",
          data: "lastVolume",
          type: "num",
        },
        {
          title: "VOL: 1/(x)",
          data: "rateVolLast1andX",
          type: "num",
        },
        {
          title: "# Ups",
          data: "numberOfUps",
        },
        {
          title: "# Downs",
          data: "numberOfDowns",
        },
      ],
      // columnDefs: [
      //   {
      //     visible: false,
      //     targets: 0,
      //   },
      // ],
      rowCallback: function (row, data, index) {},
      displayLength: 100,
      drawCallback: function (settings) {
        let api = this.api();
        let rows = api
          .rows({
            page: "current",
          })
          .nodes();
        let stockCodes = [];
        let last = null;
        api
          .column(0, {
            page: "current",
          })
          .data()
          .each(function (group, i) {
            // if (last !== group) {
            //   stockCodes.push(group);
            //   $(rows)
            //     .eq(i)
            //     .before(
            //       '<tr class="group" id="group-' +
            //         group +
            //         '">' +
            //         '<td><strong><a target="_blank" href="https://finance.vietstock.vn/' +
            //         group +
            //         '/phan-tich-ky-thuat.htm">' +
            //         group +
            //         '</a></strong><span style="color:red" class="status"></span></td>' +
            //         '<td colspan="9" class="info"></td></tr>'
            //     );
            //   last = group;
            // }
          });

        // getStockInfo(stockCodes);
      },
    });
  });

  function getStockInfo(stockCodes) {
    $.ajax({
      url: HOST + "api/v1/stock-info?stockCodes=" + stockCodes.join(),
      type: "GET",
      dataType: "json",
      success: function (res) {
        console.log(res);
        for (let index = 0; index < res.length; index++) {
          const item = res[index];
          if (item.StockStatus) {
            $("#group-" + item.StockCode + " .status").text(
              "-" + item.StockStatus
            );
          }
          let priceColor = "#6b6f82";
          if (item.Change > 0) {
            priceColor = "rgb(57, 202, 50)";
          } else if (item.Change < 0) {
            priceColor = "red";
          }
          let info =
            '<strong>Cur. Price</strong> <span style="color: ' +
            priceColor +
            '">' +
            formatCurrency(item.LastPrice, 0) +
            "</span>";
          info +=
            '<span style="color: ' +
            priceColor +
            '">(' +
            item.Change +
            ") </span>" +
            "&emsp;";
          info +=
            "<strong>Avr. Price</strong> " +
            formatCurrency(item.AvrPrice, 0) +
            "&emsp;";
          info +=
            "<strong>52W </strong> " +
            formatCurrency(item.Min52W, 0) +
            " - " +
            formatCurrency(item.Max52W, 0) +
            "&emsp;&emsp;";
          info +=
            "<strong>BVPS</strong> " +
            formatCurrency(item.BVPS, 0) +
            "&emsp;&emsp;";
          info +=
            "<strong>EPS</strong> " +
            formatCurrency(item.EPS, 0) +
            "&emsp;&emsp;";
          info +=
            "<strong>PE</strong> " +
            formatCurrency(item.PE, 0) +
            "&emsp;&emsp;";
          $("#group-" + item.StockCode + " .info").html(info);
        }
      },
    });
  }

  $.ajax({
    url: HOST + "api/v1/market-price",
    type: "GET",
    dataType: "json", // added data type
    success: function (res) {
      let hose = res.find((x) => x.Code == "VNIndex");
      $(".current-vn-index").text(hose.Price).css("color", hose.Color);
      $(".current-vn-index-change")
        .text("(" + hose.Change + ")")
        .css("color", hose.Color);
      let hnx = res.find((x) => x.Code == "HNXINDEX");
      $(".current-hnx-index").text(hnx.Price).css("color", hnx.Color);
      $(".current-hnx-index-change")
        .text("(" + hnx.Change + ")")
        .css("color", hnx.Color);
    },
  });
});
