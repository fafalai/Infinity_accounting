function doDlgProductNew(productcategoryid, productid)
{
  var isnew = _.isUndefined(productid) || _.isNull(productid);
  var product = {};
  var editingIndex = null;

  function doReset()
  {
    if (isnew)
    {
      $('#fldNewProductCode').textbox('clear');
      $('#fldNewProductName').textbox('clear');
      $('#fldNewProductBarcode').textbox('clear');
      $('#fldNewProductAltcode').textbox('clear');
      $('#fldNewProductCostPrice').numberbox('clear');
      $('#fldNewProductUOM').textbox('clear');
      $('#fldNewProductUOMSize').numberbox('clear');
      $('#cbNewProductClients').combotree('clear');
      $('#cbNewProductActive').switchbutton('check');

      $('#cbNewProductBuyTaxCode').combobox('clear');
      $('#cbNewProductSellTaxCode').combobox('clear');
      $('#cbNewProductSalesAccount').combotree('clear');
      $('#cbNewProductIncomeAccount').combotree('clear');
      $('#cbNewProductAssetAccount').combotree('clear');

      $('#cbNewProductBuildTemplate').combotree('clear');
      $('#fldNewProductMinQty').numberbox('clear');
      $('#fldNewProductWarnQty').numberbox('clear');
      $('#cbNewProductAlias').combobox('clear');
      $('#cbNewProductLocation1').combotree('clear');
      $('#cbNewProductLocation2').combotree('clear');

      $('#fldNewProductWidth').numberbox('clear');
      $('#fldNewProducLength').numberbox('clear');
      $('#fldNewProductHeight').numberbox('clear');
      $('#fldNewProductWeight').numberbox('clear');

      $('#fldNewProductPrice1').numberbox('clear');
      $('#fldNewProductPrice2').numberbox('clear');
      $('#fldNewProductPrice3').numberbox('clear');
      $('#fldNewProductPrice4').numberbox('clear');
      $('#fldNewProductPrice5').numberbox('clear');
      $('#fldNewProductPrice6').numberbox('clear');
      $('#fldNewProductPrice7').numberbox('clear');
      $('#fldNewProductPrice8').numberbox('clear');
      $('#fldNewProductPrice9').numberbox('clear');
      $('#fldNewProductPrice10').numberbox('clear');
      $('#fldNewProductPrice11').numberbox('clear');
      $('#fldNewProductPrice12').numberbox('clear');
      $('#fldNewProductPrice13').numberbox('clear');
      $('#fldNewProductPrice14').numberbox('clear');
      $('#fldNewProductPrice15').numberbox('clear');

      $('#fldNewProductAttrib1').textbox('clear');
      $('#fldNewProductAttrib2').textbox('clear');
      $('#fldNewProductAttrib3').textbox('clear');
      $('#fldNewProductAttrib4').textbox('clear');
      $('#fldNewProductAttrib5').textbox('clear');
    }
    else
    {
      if (!_.isEmpty(product))
      {
        $('#fldNewProductCode').textbox('setValue', product.code);
        $('#fldNewProductName').textbox('setValue', product.name);
        $('#fldNewProductBarcode').textbox('setValue', product.barcode);
        $('#fldNewProductAltcode').textbox('setValue', product.altcode);
        $('#fldNewProductCostPrice').numberbox('setValue', product.costprice);
        $('#fldNewProductUOM').textbox('setValue', product.uom);
        $('#fldNewProductUOMSize').numberbox('setValue', product.uomsize);
        $('#cbNewProductClients').combotree('setValue', product.clientid);
        $('#cbNewProductActive').switchbutton('check', product.isactive);

        $('#cbNewProductBuyTaxCode').combobox('setValue', product.buytaxcodeid);
        $('#cbNewProductSellTaxCode').combobox('setValue', product.selltaxcodeid);
        $('#cbNewProductSalesAccount').combotree('setValue', product.costofgoodsaccountid);
        $('#cbNewProductIncomeAccount').combotree('setValue', product.incomeaccountid);
        $('#cbNewProductAssetAccount').combotree('setValue', product.assetaccountid);

        $('#cbNewProductBuildTemplate').combotree('setValue', product.buildtemplateid);
        $('#fldNewProductMinQty').numberbox('setValue', _.niceformatqty(product.minqty));
        $('#fldNewProductWarnQty').numberbox('setValue', _.niceformatqty(product.warnqty));
        $('#cbNewProductAlias').combobox('setValue', product.productaliasid);
        $('#cbNewProductLocation1').combotree('setValue', product.location1id);
        $('#cbNewProductLocation2').combotree('setValue', product.location2id);

        $('#fldNewProductWidth').numberbox('setValue', _.niceformatqty(product.width));
        $('#fldNewProducLength').numberbox('setValue', _.niceformatqty(product.length));
        $('#fldNewProductHeight').numberbox('setValue', _.niceformatqty(product.height));
        $('#fldNewProductWeight').numberbox('setValue', _.niceformatqty(product.weight));

        $('#fldNewProductPrice1').numberbox('setValue', _.niceformatqty(product.price1));
        $('#fldNewProductPrice2').numberbox('setValue', _.niceformatqty(product.price2));
        $('#fldNewProductPrice3').numberbox('setValue', _.niceformatqty(product.price3));
        $('#fldNewProductPrice4').numberbox('setValue', _.niceformatqty(product.price4));
        $('#fldNewProductPrice5').numberbox('setValue', _.niceformatqty(product.price5));
        $('#fldNewProductPrice6').numberbox('setValue', _.niceformatqty(product.price6));
        $('#fldNewProductPrice7').numberbox('setValue', _.niceformatqty(product.price7));
        $('#fldNewProductPrice8').numberbox('setValue', _.niceformatqty(product.price8));
        $('#fldNewProductPrice9').numberbox('setValue', _.niceformatqty(product.price9));
        $('#fldNewProductPrice10').numberbox('setValue', _.niceformatqty(product.price10));
        $('#fldNewProductPrice11').numberbox('setValue', _.niceformatqty(product.price11));
        $('#fldNewProductPrice12').numberbox('setValue', _.niceformatqty(product.price12));
        $('#fldNewProductPrice13').numberbox('setValue', _.niceformatqty(product.price13));
        $('#fldNewProductPrice14').numberbox('setValue', _.niceformatqty(product.price14));
        $('#fldNewProductPrice15').numberbox('setValue', _.niceformatqty(product.price15));

        $('#fldNewProductAttrib1').textbox('setValue', product.attrib1);
        $('#fldNewProductAttrib2').textbox('setValue', product.attrib2);
        $('#fldNewProductAttrib3').textbox('setValue', product.attrib3);
        $('#fldNewProductAttrib4').textbox('setValue', product.attrib4);
        $('#fldNewProductAttrib5').textbox('setValue', product.attrib5);

        if (!_.isBlank(product.barcode))
        {
          JsBarcode
          (
            '#svgNewProductBarcode',
            product.barcode,
            {
              format: barcode_defaultformat,
              lineColor: barcode_colour,
              fontoptions: barcode_fontOptions,
              textmargin: barcode_textmargin,
              width: barcode_width,
              height: barcode_height
            }
          );
        }

        $('#btnProductNewAdd').linkbutton('enable');
        $('#dlgProductNew').dialog('setTitle', 'Modify ' + product.name);
      }
    }

    doTextboxFocus('fldNewProductCode');
  }

  function doCheckCode(ev, args)
  {
    // Code already exists?
    if (args.data.rs.length > 0)
      $('#btnProductNewAdd').linkbutton('disable');
    else
      $('#btnProductNewAdd').linkbutton('enable');
  }

  function doSaved(ev, args)
  {
    $('#dlgProductNew').dialog('close');
  }

  function doListAccounts(ev, args)
  {
    $('#cbNewProductSalesAccount').combotree('loadData', cache_accounts);
    $('#cbNewProductIncomeAccount').combotree('loadData', cache_accounts);
    $('#cbNewProductAssetAccount').combotree('loadData', cache_accounts);
  }

  function doListTaxCodes(ev, args)
  {
    $('#cbNewProductBuyTaxCode').combobox('loadData', cache_accounts);
    $('#cbNewProductSellTaxCode').combobox('loadData', cache_accounts);
  }

  function doLoad(ev, args)
  {
    product = (args.data.product);
    doReset();
  }

  function doGenBarcode(ev, args)
  {
    $('#fldNewProductBarcode').textbox('setValue', args.data.barcodeno);
  }

  function doNew()
  {
    var supplierid = $('#cbNewProductSupplier').combobox('getValue');
    var code = $('#fldNewProductSupplierCode').textbox('getValue');
    var barcode = $('#fldNewProductSupplierBarcode').textbox('getValue');

    if (!_.isNull(productid) && !_.isBlank(code))
      doServerDataMessage('newproductcode', {productid: productid, supplierid: supplierid, code: code, barcode: barcode}, {type: 'refresh'});
  }

  function doClear()
  {
    $('#divNewProductSupplierCodeG').datagrid('clearSelections');
  }

  function doRemove()
  {
    if (!doGridGetSelectedRowData
      (
        'divNewProductSupplierCodeG',
        function(row)
        {
          doPromptOkCancel
          (
            'Remove code ' + row.code + '?',
            function(result)
            {
              if (result)
                doServerDataMessage('expireproductcode', {productcodeid: row.id}, {type: 'refresh'});
            }
          );
        }
      ))
    {
      doShowError('Please select an attachment to remove');
    }
  }

  function doListCodes(ev, args)
  {
    $('#divNewProductSupplierCodeG').datagrid('loadData', args.data.rs);
  }

  function doListPrices(ev, args)
  {
    var data = [];

    console.log("do list prices");
    // console.log(args.data.rs);
    // console.log(args);
    args.data.rs.forEach
    (
      function(p)
      {
        data.push
        (
          {
            id: doNiceId(p.id),
            clientid: doNiceId(p.clientid),
            minqty: p.minqty,
            maxqty: p.maxqty,
            price: p.price,
            datefrom:p.datefrom,
            dateto:p.dateto,
            date: doNiceDateModifiedOrCreated(p.datemodified, p.datecreated),
            by: doNiceModifiedBy(p.datemodified, p.usermodified, p.usercreated)
          }
        );
      }
    );

    console.log(data);

    $('#divNewProductPricesG').datagrid('loadData', data);

    if (!_.isUndefined(args.pdata.priceid) && !_.isNull(args.pdata.priceid))
    {
      console.log(args.pdata.priceid);
      $('#divNewProductPricesG').datagrid('selectRecord', args.pdata.priceid);
    }



  }

  function doSavedCode(ev, args)
  {
    doServerDataMessage('listproductcodes', {productid: productid}, {type: 'refresh'});
  }

  function doNewCode(ev, args)
  {
    console.log(args);
    if (args.data.productid == productid)
      doServerDataMessage('listproductcodes', {productid: productid}, {type: 'refresh'});
  }

  function doPricingNew(ev, args)
  {
    console.log("add a new price");
    doServerDataMessage('newproductpricing', {productid: productid}, {type: 'refresh'});
  }

  function doPricingClear(ev, args)
  {
    $('#divNewProductPricesG').datagrid('clearSelections');
  }

  function doPricingEdit(ev, args)
  {
    doGridStartEdit
    (
      'divNewProductPricesG',
      editingIndex,
      function(row, index)
      {
        editingIndex = index;

        doGridGetEditor
        (
          'divNewProductPricesG',
          editingIndex,
          'price',
          function(ed)
          {
          }
        );
      }
    );
  }

  function doPricingCancel(ev, args)
  {
    editingIndex = doGridCancelEdit('divNewProductPricesG', editingIndex);
  }

  function doPricingSave(ev, args)
  {
    doGridEndEditGetRow
    (
      'divNewProductPricesG',
      editingIndex,
      function(row)
      {
        doServerDataMessage('saveproductpricing', {priceid: row.id, productid: productid, clientid: row.clientid, minqty: row.minqty, maxqty: row.maxqty, price: row.price, price1: row.price1, price2: row.price2, price3: row.price3, price4: row.price4, price5: row.price5}, {type: 'refresh'});
      }
    );

    editingIndex = null;
  }

  function doPricingRemove(ev, args)
  {
    if (!doGridGetSelectedRowData
      (
        'divNewProductPricesG',
        function(row)
        {
          doPromptOkCancel
          (
            'Remove selected price?',
            function(result)
            {
              if (result)
                doServerDataMessage('expireproductpricing', {priceid: row.id}, {type: 'refresh'});
            }
          );
        }
      ))
    {
      doShowError('Please select a price to remove');
    }
  }

  function doEventsHandler(ev, args)
  {
    if (args == 'new')
      doNew();
    else if (args == 'clear')
      doClear();
    else if (args == 'remove')
      doRemove();
  }

  function doPricingEventsHandler(ev, args)
  {
    if (args == 'new')
      doPricingNew();
    else if (args == 'clear')
      doPricingClear();
      else if (args == 'edit')
      doPricingEdit();
      else if (args == 'cancel')
      doPricingCancel();
      else if (args == 'save')
      doPricingSave();
    else if (args == 'remove')
      doPricingRemove();
  }

  function doUpdatePrice(ev, args)
  {
    doServerDataMessage('listproductpricing', {productid: product.id}, {type: 'refresh', productid: product.id, priceid: args.data.priceid});
  }

  $('#divEvents').on('checkproductcode', doCheckCode);
  $('#divEvents').on('newproduct', doSaved);
  $('#divEvents').on('updateproduct', doSaved);
  $('#divEvents').on('listaccounts', doListAccounts);
  $('#divEvents').on('listtaxcodes', doListTaxCodes);
  $('#divEvents').on('loadproduct', doLoad);
  $('#divEvents').on('posgenbarcode', doGenBarcode);
  $('#divEvents').on('listproductpricing', doListPrices);
  $('#divEvents').on('newproductcode', doSavedCode);
  $('#divEvents').on('expireproductcode', doSavedCode);
  $('#divEvents').on('listproductcodes', doListCodes);
  $('#divEvents').on('productcodecreated', doNewCode);
  $('#divEvents').on('productcodeexpired', doNewCode);

  $('#divEvents').on('productcodepopup', doEventsHandler);
  $('#divEvents').on('pricingpopup', doPricingEventsHandler);
  //New
  $('#divEvents').on('productpricingupdated', doUpdatePrice);


  $('#dlgProductNew').dialog
  (
    {
      onClose: function()
      {
        $('#divEvents').off('checkproductcode', doCheckCode);
        $('#divEvents').off('newproduct', doSaved);
        $('#divEvents').off('updateproduct', doSaved);
        $('#divEvents').off('listaccounts', doListAccounts);
        $('#divEvents').off('listtaxcodes', doListTaxCodes);
        $('#divEvents').off('loadproduct', doLoad);
        $('#divEvents').off('posgenbarcode', doGenBarcode);
        $('#divEvents').off('listproductpricing', doListPrices);
        $('#divEvents').off('newproductcode', doSavedCode);
        $('#divEvents').off('expireproductcode', doSavedCode);
        $('#divEvents').off('listproductcodes', doListCodes);
        $('#divEvents').off('productcodecreated', doNewCode);
        $('#divEvents').off('productcodeexpired', doNewCode);

        $('#divEvents').off('productcodepopup', doEventsHandler);
        $('#divEvents').off('pricingpopup', doPricingEventsHandler);
        $('#divEvents').off('productpricingupdated', doUpdatePrice);

        $('#svgNewProductBarcode').empty();
      },
      onOpen: function()
      {
        $('#fldNewProductCode').textbox
        (
          {
            onChange: function(newValue, oldValue)
            {
              if (!_.isBlank(newValue))
              {
                // Check we're using a unique code...
                if (newValue != oldValue)
                  doServerDataMessage('checkproductcode', {productid: productid, code: newValue}, {type: 'refresh'});
              }
              else
                $('#btnProductNewCreate').linkbutton('disable');
            }
          }
        );

        $('#fldNewProductBarcode').textbox
        (
          {
            onClickButton: function()
            {
              doServerDataMessage('posgenbarcode', {type: barcode_defaultformat}, {type: 'refresh'});
            },
            onChange: function(newValue, oldValue)
            {
              if (!_.isBlank(newValue))
              {
                if ((newValue.length == barcode_defaultformat_length) || (newValue.length == (barcode_defaultformat_length + 1)))
                {
                  JsBarcode
                  (
                    '#svgNewProductBarcode',
                    newValue,
                    {
                      format: barcode_defaultformat,
                      lineColor: barcode_colour,
                      fontoptions: barcode_fontOptions,
                      textmargin: barcode_textmargin,
                      width: barcode_width,
                      height: barcode_height
                    }
                  );
                }
                else
                  doMandatoryTextbox(barcode_defaultformat.toUpperCase() + ' barcodes require ' + barcode_defaultformat_length + ' digits', 'fldNewProductBarcode');
              }
              else
                $('#svgNewProductBarcode').empty();
            }
          }
        );

        $('#cbNewProductSupplier').combotree
        (
          {
            valueField: 'id',
            textField: 'name',
            multiple: false,
            data: cache_suppliers,
            limitToList: true,
            onSelect: function(record)
            {
              doServerDataMessage('loadsupplier', {supplierid: record.id}, {type: 'refresh'});
            }
          }
        );

        $('#fldNewProductSupplierCode').textbox
        (
          {
            onChange: function(newValue, oldValue)
            {
              if (!_.isBlank(newValue))
              {
                // Check we're using a unique code...
                if (newValue != oldValue)
                {
                  // First check locally in grid, see if we've already entered this guy - since back end check only looks at codes across other products...
                  var data = $('#divNewProductSupplierCodeG').datagrid('getData');

                  if (data.rows)
                  {
                    var found = -1;

                    for (var d = 0; d < data.rows.length; d++)
                    {
                      if (data.rows[d].code.toUpperCase() == newValue.toUpperCase())
                      {
                        found = d;
                        break;
                      }
                    }

                    if (found != -1)
                    {
                      noty({text: 'Product code [' + newValue + '] is already used', type: 'error', timeout: 4000});
                      $('#divNewProductSupplierCodeG').datagrid('selectRow', found);
                      return;
                    }
                  }

                  doServerDataMessage('checkproductcode', {productid: productid, code: newValue}, {type: 'refresh'});
              }
              }
            }
          }
        );

        $('#fldNewProductSupplierBarcode').textbox
        (
          {
            onChange: function(newValue, oldValue)
            {
              if (!_.isBlank(newValue))
              {
                if (!_.isBlank(newValue))
                {
                  if ((newValue.length == barcode_defaultformat_length) || (newValue.length == (barcode_defaultformat_length + 1)))
                  {
                    JsBarcode
                    (
                      '#svgNewProductSupplierBarcode',
                      newValue,
                      {
                        format: barcode_defaultformat,
                        lineColor: barcode_colour,
                        fontoptions: barcode_fontOptions,
                        textmargin: barcode_textmargin,
                        width: barcode_width,
                        height: barcode_height
                      }
                    );
                  }
                }
              }
            }
          }
        );

        $('#cbNewProductClients').combotree
        (
          {
            valueField: 'id',
            textField: 'name',
            data: cache_clients
          }
        );

        $('#cbNewProductBuyTaxCode').combobox
        (
          {
            valueField: 'id',
            textField: 'name',
            data: cache_taxcodes
          }
        );

        $('#cbNewProductSellTaxCode').combobox
        (
          {
            valueField: 'id',
            textField: 'name',
            data: cache_taxcodes
          }
        );

        $('#cbNewProductSalesAccount').combotree
        (
          {
            valueField: 'id',
            textField: 'name',
            data: cache_accounts
          }
        );

        $('#cbNewProductIncomeAccount').combotree
        (
          {
            valueField: 'id',
            textField: 'name',
            data: cache_accounts
          }
        );

        $('#cbNewProductAssetAccount').combotree
        (
          {
            valueField: 'id',
            textField: 'name',
            data: cache_accounts
          }
        );

        $('#cbNewProductBuildTemplate').combotree
        (
          {
            valueField: 'id',
            textField: 'name',
            data: cache_buildtemplates
          }
        );

        $('#cbNewProductAlias').combobox
        (
          {
            valueField: 'id',
            textField: 'code',
            groupField: 'productcategoryname',
            data: cache_products
          }
        );

        $('#cbNewProductLocation1').combotree
        (
          {
            valueField: 'id',
            textField: 'name',
            data: cache_locations
          }
        );

        $('#cbNewProductLocation2').combotree
        (
          {
            valueField: 'id',
            textField: 'name',
            data: cache_locations
          }
        );

        $('#divNewProductSupplierCodeG').datagrid
        (
          {
            idField: 'id',
            fitColumns: true,
            singleSelect: true,
            rownumbers: true,
            striped: true,
            toolbar: '#tbProductCodes',
            columns:
            [
              [
                {title: 'Supplier', field: 'supplierid', width: 200, align: 'left', resizable: true, formatter: function(value, row) {return doGetStringFromIdInObjArray(cache_suppliers, value);}},
                {title: 'Code',     field: 'code',       width: 100, align: 'left', resizable: true},
                {title: 'Barcode',  field: 'barcode',    width: 100, align: 'left', resizable: true}
              ]
            ],
            onDblClickCell: function(index, field, value)
            {
            }
          }
        );

        $('#divNewProductPricesG').datagrid
        (
          {
            idField: 'id',
            fitColumns: true,
            singleSelect: true,
            rownumbers: true,
            striped: true,
            toolbar: '#tbPricing',
            columns:
            [
              [
                {title: 'Client',    field: 'clientid', width: 200, align: 'left',  resizable: true, editor: {type: 'combobox',  options: {panelWidth: 300, valueField: 'id', textField: 'name', data: cache_clients, onSelect: function(record) {console.log(record);}}}, formatter: function(value, row) {return doGetStringFromIdInObjArray(cache_clients, value);}},
                {title: 'Min Qty',   field: 'minqty',   width: 100, align: 'right', resizable: true, editor: {type: 'numberbox', options: {groupSeparator: ',', precision: 0}}, formatter: function(value, row, index) {return _.niceformatqty(value);}, align: 'right'},
                {title: 'Max Qty',   field: 'maxqty',   width: 100, align: 'right', resizable: true, editor: {type: 'numberbox', options: {groupSeparator: ',', precision: 0}}, formatter: function(value, row, index) {return _.niceformatqty(value);}, align: 'right'},
                {title: 'Price',     field: 'price',    width: 100, align: 'right', resizable: true, editor: {type: 'numberbox', options: {groupSeparator: ',', precision: 2}}, formatter: function(value, row, index) {return _.niceformatnumber(value);}, align: 'right'},
                {title: 'Date From', field: 'datefrom', width: 150, align: 'right', resizable: true, editor: {type: 'datebox'}, formatter: function(value, row, index) {return _.nicejsdatetodisplay(value);}, align: 'right'},
                {title: 'Date To',   field: 'dateto',   width: 150, align: 'right', resizable: true, editor: {type: 'datebox'}, formatter: function(value, row, index) {return _.nicejsdatetodisplay(value);}, align: 'right'},
                {title: 'Modified',  field: 'date',     width: 150, align: 'right', resizable: true, align: 'right'},
                {title: 'By',        field: 'by',       width: 200, align: 'left',  resizable: true}
              ]
            ],
            onRowContextMenu: function(e, index, row)
            {
              doGridContextMenu('divNewProductPricesG', 'divPricingMenuPopup', e, index, row);
            },
            onDblClickCell: function(index, field, value)
            {
              console.log("double click a product price cell");
              console.log(index);
              console.log(field);
              console.log(value);
              doGridStartEdit
              (
                'divNewProductPricesG',
                editingIndex,
                function(row, index)
                {
                  editingIndex = index;
                  console.log(editingIndex);
                  console.log(['date', 'by'].indexOf(field));

                  if (['date', 'by'].indexOf(field) != -1)
                  {
                    field = 'minqty';
                  }
                  console.log(field)
                    

                  doGridGetEditor
                  (
                    'divNewProductPricesG',
                    editingIndex,
                    field,
                    function(ed)
                    {
                    }
                  );
                }
              );
            }
          }
        );

        $('#newproducttabs').tabs
        (
          {
            selected: 0
          }
        );        

        if (isnew)
          $('#btnProductNewAdd').linkbutton({text: 'Add'});
        else
          $('#btnProductNewAdd').linkbutton({text: 'Save'});

        if (!_.isNull(productid))
        {
          doServerDataMessage('loadproduct', {productid: productid}, {type: 'refresh'});
          doServerDataMessage('listproductcodes', {productid: productid}, {type: 'refresh'});
          doServerDataMessage('listproductpricing', {productid: productid}, {type: 'refresh'});
        }
        else
          doReset();
      },
      buttons:
      [
        {
          text: 'Add',
          disabled: true,
          id: 'btnProductNewAdd',
          handler: function()
          {
            var code = $('#fldNewProductCode').textbox('getValue');
            var name = $('#fldNewProductName').textbox('getValue');

            if (!_.isBlank(code) && !_.isBlank(name))
            {
              var barcode = $('#fldNewProductBarcode').textbox('getValue');
              var altcode = $('#fldNewProductAltcode').textbox('getValue');
              var costprice = $('#fldNewProductCostPrice').numberbox('getValue');
              var uom = $('#fldNewProductUOM').textbox('getValue');
              var uomsize = $('#fldNewProductUOMSize').numberbox('getValue');
              var clientid = doGetComboTreeSelectedId('cbNewProductClients');
              var isactive = doSwitchButtonChecked('cbNewProductActive');

              var buytaxcodeid = $('#cbNewProductBuyTaxCode').combobox('getValue');
              var selltaxcodeid = $('#cbNewProductSellTaxCode').combobox('getValue');
              var costofgoodsaccountid = doGetComboTreeSelectedId('cbNewProductSalesAccount');
              var incomeaccountid = doGetComboTreeSelectedId('cbNewProductIncomeAccount');
              var assetaccountid = doGetComboTreeSelectedId('cbNewProductAssetAccount');

              var buildtemplateid = doGetComboTreeSelectedId('cbNewProductBuildTemplate');
              var minqty = $('#fldNewProductMinQty').numberbox('getValue');
              var warnqty = $('#fldNewProductWarnQty').numberbox('getValue');
              var productaliasid = $('#cbNewProductAlias').combobox('getValue');
              var location1id = $('#cbNewProductLocation1').combobox('getValue');
              var location2id = $('#cbNewProductLocation2').combobox('getValue');

              var width = $('#fldNewProductWidth').numberbox('getValue');
              var length = $('#fldNewProducLength').numberbox('getValue');
              var height = $('#fldNewProductHeight').numberbox('getValue');
              var weight = $('#fldNewProductWeight').numberbox('getValue');

              var price1 = $('#fldNewProductPrice1').numberbox('getValue');
              var price2 = $('#fldNewProductPrice2').numberbox('getValue');
              var price3 = $('#fldNewProductPrice3').numberbox('getValue');
              var price4 = $('#fldNewProductPrice4').numberbox('getValue');
              var price5 = $('#fldNewProductPrice5').numberbox('getValue');
              var price6 = $('#fldNewProductPrice6').numberbox('getValue');
              var price7 = $('#fldNewProductPrice7').numberbox('getValue');
              var price8 = $('#fldNewProductPrice8').numberbox('getValue');
              var price9 = $('#fldNewProductPrice9').numberbox('getValue');
              var price10 = $('#fldNewProductPrice10').numberbox('getValue');
              var price11 = $('#fldNewProductPrice11').numberbox('getValue');
              var price12 = $('#fldNewProductPrice12').numberbox('getValue');
              var price13 = $('#fldNewProductPrice13').numberbox('getValue');
              var price14 = $('#fldNewProductPrice14').numberbox('getValue');
              var price15 = $('#fldNewProductPrice15').numberbox('getValue');

              var attrib1 = $('#fldNewProductAttrib1').textbox('getValue');
              var attrib2= $('#fldNewProductAttrib2').textbox('getValue');
              var attrib3= $('#fldNewProductAttrib3').textbox('getValue');
              var attrib4= $('#fldNewProductAttrib4').textbox('getValue');
              var attrib5 = $('#fldNewProductAttrib5').textbox('getValue');

              if (isnew)
              {
                doServerDataMessage
                (
                  'newproduct',
                  {
                    productcategoryid: productcategoryid,
                    code: code,
                    name: name,
                    barcode: barcode,
                    altcode: altcode,
                    costprice: costprice,
                    uom: uom,
                    uomsize: uomsize,
                    clientid: clientid,
                    isactive: isactive,
                    buytaxcodeid: buytaxcodeid,
                    selltaxcodeid: selltaxcodeid,
                    costofgoodsaccountid: costofgoodsaccountid,
                    incomeaccountid: incomeaccountid,
                    assetaccountid: assetaccountid,
                    buildtemplateid: buildtemplateid,
                    minqty: minqty,
                    warnqty: warnqty,
                    productaliasid: productaliasid,
                    location1id: location1id,
                    location2id: location2id,
                    width: width,
                    length: length,
                    height: height,
                    weight: weight,
                    price1: price1,
                    price2: price2,
                    price3: price3,
                    price4: price4,
                    price5: price5,
                    price6: price6,
                    price7: price7,
                    price8: price8,
                    price9: price9,
                    price10: price10,
                    price11: price11,
                    price12: price12,
                    price13: price13,
                    price14: price14,
                    price15: price15,
                    attrib1: attrib1,
                    attrib2: attrib2,
                    attrib3: attrib3,
                    attrib4: attrib4,
                    attrib5: attrib5
                  },
                  {type: 'refresh'}
                );
              }
              else
              {
                doServerDataMessage
                (
                  'saveproduct',
                  {
                    productid: productid,
                    productcategoryid: productcategoryid,
                    name: name,
                    code: code,
                    barcode: barcode,
                    altcode: altcode,
                    costprice: costprice,
                    uom: uom,
                    uomsize: uomsize,
                    clientid: clientid,
                    isactive: isactive,
                    buytaxcodeid: buytaxcodeid,
                    selltaxcodeid: selltaxcodeid,
                    costofgoodsaccountid: costofgoodsaccountid,
                    incomeaccountid: incomeaccountid,
                    assetaccountid: assetaccountid,
                    buildtemplateid: buildtemplateid,
                    minqty: minqty,
                    warnqty: warnqty,
                    productaliasid: productaliasid,
                    location1id: location1id,
                    location2id: location2id,
                    width: width,
                    length: length,
                    height: height,
                    weight: weight,
                    price1: price1,
                    price2: price2,
                    price3: price3,
                    price4: price4,
                    price5: price5,
                    price6: price6,
                    price7: price7,
                    price8: price8,
                    price9: price9,
                    price10: price10,
                    price11: price11,
                    price12: price12,
                    price13: price13,
                    price14: price14,
                    price15: price15,
                    attrib1: attrib1,
                    attrib2: attrib2,
                    attrib3: attrib3,
                    attrib4: attrib4,
                    attrib5: attrib5
                  },
                  {type: 'refresh'}
                );
              }
            }
            else
              doMandatoryTextbox('Need at least a product code and name', 'fldNewProductCode');
          }
        },
        {
          text: 'Reset',
          handler: function()
          {
            doReset();
          }
        },
        {
          text: 'Close',
          handler: function()
          {
            $('#dlgProductNew').dialog('close');
          }
        }
      ]
    }
  ).dialog('center').dialog('open');
}
