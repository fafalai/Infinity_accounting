function doDlgProductPricing(product)
{
  var editingIndex = null;
  var tb =
  [
    {
      text: 'New',
      iconCls: 'icon-add',
      handler: doNew
    },
    {
      text: 'Clear',
      iconCls: 'icon-clear',
      handler: doClear
    },
    {
      text: 'Edit',
      iconCls: 'icon-edit',
      handler: doEdit
    },
    {
      text: 'Cancel',
      iconCls: 'icon-cancel',
      handler: doCancel
    },
    {
      text: 'Save',
      iconCls: 'icon-save',
      handler: doSave
    },
    {
      text: 'Remove',
      iconCls: 'icon-remove',
      handler: doRemove
    },
    {
      text: 'Copy to Levels',
      iconCls: 'icon-copy',
      handler: doCopyToLevels
    }
  ];

  function doNew()
  {
    doServerDataMessage('newproductpricing', {productid: product.id}, {type: 'refresh'});
  }

  function doClear()
  {
    $('#divProductPricesG').datagrid('clearSelections');
  }

  function doEdit()
  {
    doGridStartEdit
    (
      'divProductPricesG',
      editingIndex,
      function(row, index)
      {
        editingIndex = index;

        doGridGetEditor
        (
          'divProductPricesG',
          editingIndex,
          'name',
          function(ed)
          {
          }
        );
      }
    );
  }

  function doCancel()
  {
    editingIndex = doGridCancelEdit('divProductPricesG', editingIndex);
  }

  function doSave()
  {
    doGridEndEditGetRow
    (
      'divProductPricesG',
      editingIndex,
      function(row)
      {
        doServerDataMessage('saveproductpricing', {priceid: row.id, productid: product.id, clientid: row.clientid, minqty: row.minqty, maxqty: row.maxqty, price: row.price, price1: row.price1, price2: row.price2, price3: row.price3, price4: row.price4, price5: row.price5}, {type: 'refresh'});
      }
    );

    editingIndex = null;
  }

  function doRemove()
  {
    if (!doGridGetSelectedRowData
      (
        'divProductPricesG',
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

  function doCopyToLevels()
  {
    if (!doGridGetSelectedRowData
      (
        'divProductPricesG',
        function(row, index)
        {
          doPromptOkCancel
          (
            'Copy default price to all levels for selected price?',
            function(result)
            {
              if (result)
              {
                // Not in edit mode for this row?
                if (_.isNull(editingIndex))
                {
                  $('#divProductPricesG').datagrid
                  (
                    'updateRow',
                    {
                      index: index,
                      row:
                      {
                        price1: row.price,
                        price2: row.price,
                        price3: row.price,
                        price4: row.price,
                        price5: row.price
                      }
                    }
                  );

                  doServerDataMessage('saveproductpricing', {priceid: row.id, productid: product.id, clientid: row.clientid, minqty: row.minqty, maxqty: row.maxqty, price: row.price, price1: row.price, price2: row.price, price3: row.price, price4: row.price, price5: row.price}, {type: 'refresh'});
                }
                else
                {
                  // Editing this row, so get price being edited now...
                  doGridGetEditor
                  (
                    'divProductPricesG',
                    editingIndex,
                    'price',
                    function(ed)
                    {
                      var p = $(ed.target).numberbox('getValue');

                      // Now copy to all other price level cells...
                      for (var e = 1; e <= 5; e++)
                      {
                        doGridGetEditor
                        (
                          'divProductPricesG',
                          editingIndex,
                          'price' + e,
                          function(ed)
                          {
                            $(ed.target).numberbox('setValue', p);
                          }
                        );
                      }
                    }
                  );
                }
              }
            }
          );
        }
      ))
    {
      doShowError('Please select a price to copy');
    }
  }

  function doSaved(ev, args)
  {
    doServerDataMessage('listproductpricing', {productid: product.id}, {type: 'refresh', productid: product.id, priceid: args.data.priceid});
  }

  function doLoad(ev, args)
  {
    var data = [];
    console.log(args.data.rs);
    console.log(args.pdata);

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
            price1: p.price1,
            price2: p.price2,
            price3: p.price3,
            price4: p.price4,
            price5: p.price5,
            date: doNiceDateModifiedOrCreated(p.datemodified, p.datecreated),
            by: doNiceModifiedBy(p.datemodified, p.usermodified, p.usercreated)
          }
        );
      }
    );

    $('#divProductPricesG').datagrid('loadData', data);

    if (!_.isUndefined(args.pdata.priceid) && !_.isNull(args.pdata.priceid))
    {
      console.log(args.pdata.priceid);
      $('#divProductPricesG').datagrid('selectRecord', args.pdata.priceid);
    }
      
  }

  // Need to destroy/re-create this event since it depends on arguments that change each call...
  $('#divEvents').on('productpricingupdated', doSaved);
  $('#divEvents').on('listproductpricing', doLoad);

  $('#dlgProductPrices').dialog
  (
    {
      title: 'Prices for ' + product.name,
      onClose: function()
      {
        $('#divEvents').off('productpricingupdated', doSaved);
        $('#divEvents').off('listproductpricing', doLoad);
      },
      onOpen: function()
      {
        $('#divProductPricesG').datagrid
        (
          {
            idField: 'id',
            fitColumns: false,
            singleSelect: true,
            rownumbers: true,
            striped: true,
            toolbar: tb,
            columns:
            [
              [
                {title: 'Client',   rowspan: 2, field: 'clientid', width: 200, align: 'left',  resizable: true, editor: {type: 'combobox',  options: {panelWidth: 300, valueField: 'id', textField: 'name', data: cache_clients, onSelect: function(record) {console.log(record);}}}, formatter: function(value, row) {return doGetStringFromIdInObjArray(cache_clients, value);}},
                {title: 'Min Qty',  rowspan: 2, field: 'minqty',   width: 100, align: 'right', resizable: true, editor: {type: 'numberbox', options: {groupSeparator: ',', precision: 0}}, formatter: function(value, row, index) {return _.niceformatqty(value);}, align: 'right'},
                {title: 'Max Qty',  rowspan: 2, field: 'maxqty',   width: 100, align: 'right', resizable: true, editor: {type: 'numberbox', options: {groupSeparator: ',', precision: 0}}, formatter: function(value, row, index) {return _.niceformatqty(value);}, align: 'right'},
                {title: 'Price',    rowspan: 2, field: 'price',    width: 100, align: 'right', resizable: true, editor: {type: 'numberbox', options: {groupSeparator: ',', precision: 2}}, formatter: function(value, row, index) {return _.niceformatnumber(value);}, align: 'right'},
                {title: 'Level',    colspan: 5},
                {title: 'Modified', rowspan: 2, field: 'date',     width: 150, align: 'right', resizable: true, align: 'right'},
                {title: 'By',       rowspan: 2, field: 'by',       width: 200, align: 'left',  resizable: true}
              ],
              [
                {title: '1',                    field: 'price1',   width: 100, align: 'right', resizable: true, editor: {type: 'numberbox', options: {groupSeparator: ',', precision: 2}}, formatter: function(value, row, index) {return _.niceformatnumber(value);}, align: 'right'},
                {title: '2',                    field: 'price2',   width: 100, align: 'right', resizable: true, editor: {type: 'numberbox', options: {groupSeparator: ',', precision: 2}}, formatter: function(value, row, index) {return _.niceformatnumber(value);}, align: 'right'},
                {title: '3',                    field: 'price3',   width: 100, align: 'right', resizable: true, editor: {type: 'numberbox', options: {groupSeparator: ',', precision: 2}}, formatter: function(value, row, index) {return _.niceformatnumber(value);}, align: 'right'},
                {title: '4',                    field: 'price4',   width: 100, align: 'right', resizable: true, editor: {type: 'numberbox', options: {groupSeparator: ',', precision: 2}}, formatter: function(value, row, index) {return _.niceformatnumber(value);}, align: 'right'},
                {title: '5',                    field: 'price5',   width: 100, align: 'right', resizable: true, editor: {type: 'numberbox', options: {groupSeparator: ',', precision: 2}}, formatter: function(value, row, index) {return _.niceformatnumber(value);}, align: 'right'},
              ]
            ],
            onRowContextMenu: function(e, index, row)
            {
              doGridContextMenu('divProductPricesG', 'divProductPricesMenuPopup', e, index, row);
            },
            onDblClickCell: function(index, field, value)
            {
              doGridStartEdit
              (
                'divProductPricesG',
                editingIndex,
                function(row, index)
                {
                  editingIndex = index;

                  if (['date', 'by'].indexOf(field) != -1)
                    field = 'minqty';

                  doGridGetEditor
                  (
                    'divProductPricesG',
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

        doServerDataMessage('listproductpricing', {productid: product.id}, {type: 'refresh'});
      },
      buttons:
      [
        {
          text: 'Close',
          handler: function()
          {
            $('#dlgProductPrices').dialog('close');
          }
        }
      ]
    }
  ).dialog('center').dialog('open');
}

