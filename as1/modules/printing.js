// *******************************************************************************************************************************************************************************************
// Internal functions
function doGetTimeClockPeriodFromToday(paystartdow)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      var today = new global.moment().subtract(1, 'day');
      var lastpayday = new global.moment().subtract(1, 'day');

      // Go back one day at a time until previous pay day (which could be today if today is pay day)...
      while (lastpayday.weekday() != paystartdow)
        lastpayday = lastpayday.subtract(1, 'day');

      //resolve({today: new global.moment('2017-09-27 23:59:59'), lastpayday: new global.moment('2017-09-27 00:00:00')});
      resolve({today: today, lastpayday: lastpayday});
    }
  );
  return promise;
}

function doCalcPayrollFromRtap(client, startdate, enddate)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      var dtstart = global.moment(startdate, 'YYYY-MM-DD').hour(0).minute(0).second(0);
      var dtend = global.moment(enddate, 'YYYY-MM-DD').hour(23).minute(59).second(59);
      var dtstartformatted = dtstart.format('YYYY-MM-DD HH:mm:ss');
      var dtendformatted = dtend.format('YYYY-MM-DD HH:mm:ss');

      global.log.info({docalcpayrollfromrtap: true}, 'RTAP data for period: ' + dtstartformatted + ' - ' + dtendformatted);

      client.query
      (
        'select ' +
        'r1.rfid,' +
        'r1.employeeid,' +
        'r1.lastname,' +
        'r1.firstname,' +
        'r1.code,' +
        'r1.starttime,' +
        'r1.endtime,' +
        'r1.dom,' +
        'r1.workhours,' +
        'r1.overtimeallowed ' +
        'from ' +
        'getrtapdata($1,to_timestamp($2,\'YYYY-MM-DD hh24:mi:ss\')::timestamp without time zone,to_timestamp($3,\'YYYY-MM-DD hh24:mi:ss\')::timestamp without time zone) r1 ' +
        'order by ' +
        'r1.lastname,' +
        'r1.firstname,' +
        'r1.starttime',
        [
          global.config.defaults.defaultcustomerid,
          dtstartformatted,
          dtendformatted
        ],
        function(err, result)
        {
          if (!err)
          {
            var emptotals = [];

            result.rows.forEach
            (
              function(r)
              {
                var starttime = new global.moment(r.starttime);
                var endtime = new global.moment(r.endtime);
                var dow = starttime.weekday();

                r.name = r.lastname + ', ' + r.firstname;

                r.starttime = starttime.format('YYYY-MM-DD HH:mm:ss');
                r.endtime = endtime.format('YYYY-MM-DD HH:mm:ss');
                r.downame = starttime.format('ddd');

                // They only tapped once - either on way in or on way out...
                if (starttime.isSame(endtime))
                {
                  r.actualstarttime = starttime;
                  r.actualendtime = endtime;
                  r.nminutes = 0;
                  r.ominutes = 0;
                  r.subminutes = '';
                }
                else if (!__.isBlank(r.workhours))
                {
                  global.safejsonparse
                  (
                    r.workhours,
                    function(err, robj)
                    {
                      if (!err)
                      {
                        // Working hours for this day for this employee...
                        var hours_temp = robj[dow];
                        // Convert to moment() type - we only want the time portion anyway, ignore date...
                        var hours =
                        {
                          start: new global.moment(hours_temp.start, 'HH:mm'),
                          finish: new global.moment(hours_temp.finish, 'HH:mm')
                        };
                        // Breakdown the timestamp to start hour/minute and end hour/minute so we can compare to work hours...
                        var hstart = starttime.hour();
                        var mstart = starttime.minute();
                        var hend = endtime.hour();
                        var mend = endtime.minute();
                        var workhstart = hours.start.hour();
                        var workmstart = hours.start.minute();
                        var workhend = hours.finish.hour();
                        var workmend = hours.finish.minute();
                        // Total normal hours and overtime hours...
                        var nminutes = 0;
                        var ominutes = 0;
                        // Some rules...
                        // if they start BEFORE official start time, use official start time;
                        // If they start AFTER official start time, use that...
                        if (hstart < workhstart)
                        {
                          starttime.hour(workhstart);
                          starttime.minute(workmstart);
                          hstart = workhstart;
                          mstart = workmstart;
                        }
                        // No overtime allowed...
                        if (r.overtimeallowed == 0)
                        {
                          // If they wok extra, ignore...
                          if ((hend > workhend) || ((hend == workhend) && (mend > workmend)))
                          {
                            endtime.hour(workhend);
                            endtime.minute(workmend);
                            hend = workhend;
                            mend = workmend;
                          }
                        }
                        // Calculate total #minutes worked
                        var normalminutes = hours.finish.diff(hours.start, 'minutes');
                        var totalminutes = endtime.diff(starttime, 'minutes') - global.config.env.lunchbreak;

                        if (totalminutes > normalminutes)
                        {
                          nminutes = normalminutes;
                          ominutes = totalminutes - normalminutes;
                        }
                        else
                          nminutes = totalminutes;

                        r.actualstarttime = starttime;
                        r.actualendtime = endtime;
                        r.nminutes = nminutes;
                        r.ominutes = ominutes;
                        r.subminutes = __.humaniseTimeInMinutes(global.moment.duration(nminutes + ominutes, 'minutes').asMinutes());
                      }
                    }
                  );
                }
                else
                {
                  var nminutes = endtime.diff(starttime, 'minutes');
                  // No work hours listed, so flexi-time - use the hours as is...
                  r.actualstarttime = r.starttime;
                  r.actualendtime = r.endtime;
                  r.nminutes = nminutes;
                  r.ominutes = 0;
                  r.subminutes = __.humaniseTimeInMinutes(global.moment.duration(nminutes, 'minutes').asMinutes());
                }
              }
            );
            // Now add up totals...
            result.rows.forEach
            (
              function(r)
              {
                var emp = emptotals.filter
                (
                  function(e)
                  {
                    return e.employeeid == r.employeeid;
                  }
                );

                if (__.isNull(emp) || (emp.length == 0))
                  emptotals.push({employeeid: r.employeeid, name: r.name, code: r.code, normal: r.nminutes, overtime: r.ominutes, total: r.nminutes + r.ominutes});
                else
                {
                  emp[0].normal += r.nminutes;
                  emp[0].overtime += r.ominutes;
                  emp[0].total += (r.nminutes + r.ominutes);
                }
              }
            );

            emptotals.forEach
            (
              function(e)
              {
                /*
                e.normal = global.moment.duration(e.normal, 'minutes').humanize();
                e.overtime = global.moment.duration(e.overtime, 'minutes').humanize();
                e.total = global.moment.duration(e.total, 'minutes').humanize();
                */
                e.normal = __.humaniseTimeInMinutes(global.moment.duration(e.normal, 'minutes').asMinutes());
                e.overtime = __.humaniseTimeInMinutes(global.moment.duration(e.overtime, 'minutes').asMinutes());
                e.total = __.humaniseTimeInMinutes(global.moment.duration(e.total, 'minutes').asMinutes());
              }
            );

            resolve({tags: result.rows, emp: emptotals, datefrom: dtstartformatted, dateto: dtendformatted});
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doSaveEmail(tx, world)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'insert into emails (customers_id,orders_id,copyno,recipients,subject,body,userscreated_id,datesent) values ($1,$2,$3,$4,$5,$6,$7,$8) returning id',
        [
          world.cn.custid,
          __.sanitiseAsBigInt(world.orderid),
          world.copyno,
          __.sanitiseAsString(world.recipients),
          __.sanitiseAsString(world.subject),
          __.sanitiseAsString(world.message),
          world.cn.userid,
          'now()'
        ],
        function(err, result)
        {
          if (!err)
          {
            var emailid = result.rows[0].id;

            tx.query
            (
              'select e1.datecreated,u1.name usercreated from emails e1 left join users u1 on (e1.userscreated_id=u1.id) where e1.customers_id=$1 and e1.id=$2',
              [
                world.cn.custid,
                __.sanitiseAsBigInt(emailid)
              ],
              function(err, result)
              {
                if (!err)
                {
                  var e = result.rows[0];

                  resolve
                  (
                    {
                      emailid: emailid,
                      datecreated: global.moment(e.datecreated).format('YYYY-MM-DD HH:mm:ss'),
                      usercreated: e.usercreated
                    }
                  );
                }
                else
                  reject(err);
              }
            );

            resolve(emailid);
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doSetLastPrintNo(tx, custid, userid, orderid, copyno)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'insert into prints (customers_id,orders_id,copyno,userscreated_id) values ($1,$2,$3,$4)',
        [
          custid,
          __.sanitiseAsBigInt(orderid),
          copyno,
          userid
        ],
        function(err, result)
        {
          if (!err)
            resolve(null);
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doGetLastPrintNo(tx, custid, orderid)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'select ' +
        'max(p1.copyno) lastcopyno ' +
        'from ' +
        'prints p1 ' +
        'where ' +
        'p1.customers_id=$1 ' +
        'and ' +
        'p1.orders_id=$2',
        [
          custid,
          __.sanitiseAsBigInt(orderid)
        ],
        function(err, result)
        {
          if (!err)
          {
            var copyno = 1;

            if (result.rows.length == 1)
              copyno = result.rows[0].lastcopyno + 1;
            resolve(copyno);
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doGetLastEmailNo(tx, custid, orderid)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'select ' +
        'max(e1.copyno) lastcopyno ' +
        'from ' +
        'emails e1 ' +
        'where ' +
        'e1.customers_id=$1 ' +
        'and ' +
        'e1.orders_id=$2',
        [
          custid,
          __.sanitiseAsBigInt(orderid)
        ],
        function(err, result)
        {
          if (!err)
          {
            var copyno = 1;

            if (result.rows.length == 1)
              copyno = result.rows[0].lastcopyno + 1;
            resolve(copyno);
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doGetOrderDetails(tx, custid, header)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'select ' +
        'o1.products_id productid,' +
        'o1.price,' +
        'o1.gst,' +
        'o1.qty,' +
        'o1.discount,' +
        'o1.expressfee,' +
        'p1.uomsize,' +
        'p1.code productcode,' +
        'p1.name productname ' +
        'from ' +
        'orderdetails o1 left join products p1 on (o1.products_id=p1.id) ' +
        'where ' +
        'o1.customers_id=$1 ' +
        'and ' +
        'o1.orders_id=$2 ' +
        'and ' +
        'o1.version=$3 ' +
        'and ' +
        'o1.dateexpired is null ' +
        'order by ' +
        'o1.datecreated desc',
        [
          custid,
          __.sanitiseAsBigInt(header.orderid),
          header.activeversion
        ],
        function(err, result)
        {
          if (!err)
            resolve(result.rows);
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doGetOrderHeader(tx, custid, orderid)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      tx.query
      (
        'select ' +
        'o1.id orderid,' +
        'o1.orders_id parentid,' +
        'o1.clients_id clientid,' +
        'o1.shipto_clients_id shiptoid,' +
        'o1.invoiceto_clients_id invoicetoid,' +
        'o1.orderno,' +
        'o1.invoiceno,' +
        'o1.pono,' +
        'o1.name ordername,' +
        'o1.accounts_id accountid,' +
        'o1.invoiceto_name invoicetoname,' +
        'o1.invoiceto_address1 invoicetoaddress1,' +
        'o1.invoiceto_address2 invoicetoaddress2,' +
        'o1.invoiceto_city invoicetocity,' +
        'o1.invoiceto_state invoicetostate,' +
        'o1.invoiceto_postcode invoicetopostcode,' +
        'o1.invoiceto_country invoicetocountry,' +
        'o1.shipto_name shiptoname,' +
        'o1.shipto_address1 shiptoaddress1,' +
        'o1.shipto_address2 shiptoaddress2,' +
        'o1.shipto_city shiptocity,' +
        'o1.shipto_state shiptostate,' +
        'o1.shipto_postcode shiptopostcode,' +
        'o1.shipto_country shiptocountry,' +
        'o1.shipto_notes shiptonote,' +
        'o1.numversions,' +
        'o1.activeversion,' +
        'o1.startdate,' +
        'o1.enddate,' +
        'o1.datecompleted,' +
        'o1.invoicedate,' +
        'o1.datecreated,' +
        'o1.datemodified,' +
        'c1.name clientname,' +
        'c1.code clientcode,' +
        'c1.contact1 clientcontact1,' +
        'c1.contact2 clientcontact2,' +
        'c1.acn clientacn,' +
        'c1.abn clientabn,' +
        'c1.hscode clienthscode,' +
        'c1.custcode1 clientcustcode1,' +
        'c1.custcode2 clientcustcode2,' +
        'u1.name usercreated,' +
        'u2.name usermodified ' +
        'from ' +
        'orders o1 left join users u1 on (o1.userscreated_id=u1.id) ' +
        '          left join users u2 on (o1.usersmodified_id=u2.id) ' +
        '          left join clients c1 on (o1.clients_id=c1.id) ' +
        'where ' +
        'o1.customers_id=$1 ' +
        'and ' +
        'o1.id=$2',
        [
          custid,
          __.sanitiseAsBigInt(orderid)
        ],
        function(err, result)
        {
          if (!err && (result.rows.length == 1))
          {
            // JS returns date with TZ info/format, need in ISO format...
            result.rows.forEach
            (
              function(p)
              {
                if (!__.isUN(p.startdate))
                  p.startdate = global.moment(p.startdate).format('YYYY-MM-DD HH:mm');

                if (!__.isUN(p.enddate))
                  p.enddate = global.moment(p.enddate).format('YYYY-MM-DD HH:mm');

                if (!__.isUN(p.datecompleted))
                  p.datecompleted = global.moment(p.datecompleted).format('YYYY-MM-DD HH:mm');

                if (!__.isUN(p.invoicedate))
                  p.invoicedate = global.moment(p.invoicedate).format('YYYY-MM-DD HH:mm');

                if (!__.isUN(p.datemodified))
                  p.datemodified = global.moment(p.datemodified).format('YYYY-MM-DD HH:mm');

                p.datecreated = global.moment(p.datecreated).format('YYYY-MM-DD HH:mm');
              }
            );
            resolve(result.rows[0]);
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doGetInvoiceTemplate(tx, custid, header, defaulttemplateid)
{
  global.ConsoleLog('do get invoice template');
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      //  See if there's an order level template...
      tx.query
      (
        'select ' +
        'p1.id invoicetemplateid,' +
        'p1.name ' +
        'from ' +
        'orders o1 left join printtemplates p1 on (o1.invoicetemplates_id=p1.id) ' +
        'where ' +
        'o1.customers_id=$1 ' +
        'and ' +
        'o1.id=$2',
        [
          custid,
          __.sanitiseAsBigInt(header.orderid)
        ],
        function(err, result)
        {
          if (!err)
          {
            if ((result.rows.length == 0) || __.isNull(result.rows[0].invoicetemplateid))
            {
              // Try client level template...
              tx.query
              (
                'select ' +
                'p1.id invoicetemplateid,' +
                'p1.name ' +
                'from ' +
                'clients c1 left join printtemplates p1 on (c1.invoicetemplates_id=p1.id) ' +
                'where ' +
                'c1.customers_id=$1 ' +
                'and ' +
                'c1.id=$2',
                [
                  custid,
                  __.sanitiseAsBigInt(header.clientid)
                ],
                function(err, result)
                {
                  if (!err)
                  {
                    if ((result.rows.length == 0) || __.isNull(result.rows[0].invoicetemplateid))
                    {
                      // Use system template...
                      global.ConsoleLog('defaulttemplateid');
                      global.ConsoleLog(defaulttemplateid);
                      tx.query
                      (
                        'select ' +
                        'p1.name ' +
                        'from ' +
                        'printtemplates p1 ' +
                        'where ' +
                        'p1.customers_id=$1 ' +
                        'and ' +
                        'p1.id=$2',
                        [
                          custid,
                          __.sanitiseAsBigInt(defaulttemplateid)
                        ],
                        function(err, result)
                        {
                          if (!err)
                          {
                            var templatename = global.path.join(__dirname, global.config.folders.templates + defaulttemplateid + '_' + result.rows[0].name);
                            global.ConsoleLog(templatename);
                            resolve(templatename);
                          }
                          else
                            reject(err);
                        }
                      );
                    }
                    else
                    {
                      var templatename = global.path.join(__dirname, global.config.folders.templates + result.rows[0].invoicetemplateid + '_' + result.rows[0].name);

                      resolve(templatename);
                    }
                  }
                  else
                    reject(err);
                }
              );
            }
            else
            {
              var templatename = global.path.join(__dirname, global.config.folders.templates + result.rows[0].invoicetemplateid + '_' + result.rows[0].name);

              resolve(templatename);
            }
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doGetOrderTemplate(tx, custid, header, defaulttemplateid)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      //  See if there's an order level template...
      tx.query
      (
        'select ' +
        'p1.id ordertemplateid,' +
        'p1.name ' +
        'from ' +
        'orders o1 left join printtemplates p1 on (o1.ordertemplates_id=p1.id) ' +
        'where ' +
        'o1.customers_id=$1 ' +
        'and ' +
        'o1.id=$2',
        [
          custid,
          __.sanitiseAsBigInt(header.orderid)
        ],
        function(err, result)
        {
          if (!err)
          {
            if ((result.rows.length == 0) || __.isNull(result.rows[0].ordertemplateid))
            {
              // Try client level template...
              tx.query
              (
                'select ' +
                'p1.id ordertemplateid,' +
                'p1.name ' +
                'from ' +
                'clients c1 left join printtemplates p1 on (c1.ordertemplates_id=p1.id) ' +
                'where ' +
                'c1.customers_id=$1 ' +
                'and ' +
                'c1.id=$2',
                [
                  custid,
                  __.sanitiseAsBigInt(header.clientid)
                ],
                function(err, result)
                {
                  if (!err)
                  {
                    if ((result.rows.length == 0) || __.isNull(result.rows[0].ordertemplateid))
                    {
                      // Use system template...
                      tx.query
                      (
                        'select ' +
                        'p1.name ' +
                        'from ' +
                        'printtemplates p1 ' +
                        'where ' +
                        'p1.customers_id=$1 ' +
                        'and ' +
                        'p1.id=$2',
                        [
                          custid,
                          __.sanitiseAsBigInt(defaulttemplateid)
                        ],
                        function(err, result)
                        {
                          if (!err)
                          {
                            if ((result.rows.length > 0) && !__.isNull(result.rows[0].name))
                            {
                              var templatename = global.path.join(__dirname, global.config.folders.templates + defaulttemplateid + '_' + result.rows[0].name);
                              resolve(templatename);
                            }
                            else
                              reject({message: global.text_noprinttemplate});
                          }
                          else
                            reject(err);
                        }
                      );
                    }
                    else
                    {
                      var templatename = global.path.join(__dirname, global.config.folders.templates + result.rows[0].ordertemplateid + '_' + result.rows[0].name);

                      resolve(templatename);
                    }
                  }
                  else
                    reject(err);
                }
              );
            }
            else
            {
              var templatename = global.path.join(__dirname, global.config.folders.templates + result.rows[0].ordertemplateid + '_' + result.rows[0].name);

              resolve(templatename);
            }
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doGetDeliveryDocketTemplate(tx, custid, header)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      //  See if there's an order level template...
      tx.query
      (
        'select ' +
        'p1.id deliverydockettemplateid,' +
        'p1.name ' +
        'from ' +
        'orders o1 left join printtemplates p1 on (o1.deliverydockettemplates_id=p1.id) ' +
        'where ' +
        'o1.customers_id=$1 ' +
        'and ' +
        'o1.id=$2',
        [
          custid,
          __.sanitiseAsBigInt(header.orderid)
        ],
        function(err, result)
        {
          if (!err)
          {
            if ((result.rows.length == 0) || __.isNull(result.rows[0].deliverydockettemplateid))
            {
              // Try client level template...
              tx.query
              (
                'select ' +
                'p1.id deliverydockettemplateid,' +
                'p1.name ' +
                'from ' +
                'clients c1 left join printtemplates p1 on (c1.deliverydockettemplates_id=p1.id) ' +
                'where ' +
                'c1.customers_id=$1 ' +
                'and ' +
                'c1.id=$2',
                [
                  custid,
                  __.sanitiseAsBigInt(header.clientid)
                ],
                function(err, result)
                {
                  if (!err)
                  {
                    if ((result.rows.length > 0) && !__.isNull(result.rows[0].deliverydockettemplateid))
                    {
                      var templatename = global.path.join(__dirname, global.config.folders.templates + result.rows[0].deliverydockettemplateid + '_' + result.rows[0].name);

                      resolve(templatename);
                    }
                    else
                      reject({message: global.text_noordertemplate});
                  }
                  else
                    reject(err);
                }
              );
            }
            else
            {
              var templatename = global.path.join(__dirname, global.config.folders.templates + result.rows[0].deliverydockettemplateid + '_' + result.rows[0].name);

              resolve(templatename);
            }
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

function doGetQuoteTemplate(tx, custid, header)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      //  See if there's an order level template...
      tx.query
      (
        'select ' +
        'p1.id quotetemplateid,' +
        'p1.name ' +
        'from ' +
        'orders o1 left join printtemplates p1 on (o1.quotetemplates_id=p1.id) ' +
        'where ' +
        'o1.customers_id=$1 ' +
        'and ' +
        'o1.id=$2',
        [
          custid,
          __.sanitiseAsBigInt(header.orderid)
        ],
        function(err, result)
        {
          if (!err)
          {
            if ((result.rows.length == 0) || __.isNull(result.rows[0].quotetemplateid))
            {
              // Try client level template...
              tx.query
              (
                'select ' +
                'p1.id quotetemplateid,' +
                'p1.name ' +
                'from ' +
                'clients c1 left join printtemplates p1 on (c1.quotetemplates_id=p1.id) ' +
                'where ' +
                'c1.customers_id=$1 ' +
                'and ' +
                'c1.id=$2',
                [
                  custid,
                  __.sanitiseAsBigInt(header.clientid)
                ],
                function(err, result)
                {
                  if (!err)
                  {
                    if ((result.rows.length == 0) || __.isNull(result.rows[0].quotetemplateid))
                    {
                      // Use system template...

                      resolve(global.config.folders.templates + 'quote_template.xlsx');
                    }
                    else
                    {
                      var templatename = global.path.join(__dirname, global.config.folders.templates + result.rows[0].quotetemplateid + '_' + result.rows[0].name);

                      resolve(templatename);
                    }
                  }
                  else
                    reject(err);
                }
              );
            }
            else
            {
              var templatename = global.path.join(__dirname, global.config.folders.templates + result.rows[0].quotetemplateid + '_' + result.rows[0].name);

              resolve(templatename);
            }
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}


function doGenOrder(tx, custid, header, details, templatename, uname)
{
  var promise = new global.rsvp.Promise
  (
    function(resolve, reject)
    {
      // global.ConsoleLog('resolve');
      // global.ConsoleLog(resolve);
      fs.readFile
      (
        templatename,
        function(err, data)
        {
          if (!err)
          {
            var sheetno = 1;
            var template = new global.xlwriter(data);
            var blob = null;
            // //add header
           
            
            // global.ConsoleLog(count);
            // var cell = workbook.getWorksheet(2).activeCell;
            // global.ConsoleLog(cell);
            
            var products = [];
            var totalinc = __.toBigNum(0.0);
            var totalex = __.toBigNum(0.0);
            var totalgst = __.toBigNum(0.0);
            var foldername;
            
            var no;
            var filename;
            if(__.isNull(header.invoiceno))
            {
              global.ConsoleLog("generate order excel");
              foldername = global.path.join(__dirname, global.config.folders.orders + custid);
              no = header.orderno;
              filename = global.config.defaults.defaultPrefixOrderFilename + no + global.config.defaults.defaultXLExtension;
            }
            else
            {
              global.ConsoleLog("generate invoice excel");
              foldername = global.path.join(__dirname, global.config.folders.invoices + custid);
              no = header.invoiceno;
              filename = global.config.defaults.defaultPrefixInvoiceFilename + no + global.config.defaults.defaultXLExtension;
            }
            // var no = __.isNull(header.orderno) ? header.invoiceno : header.orderno; 
            //global.ConsoleLog("folder name" + foldername);
            //global.ConsoleLog("folder no" + no);
            // var filename = global.config.defaults.defaultPrefixOrderFilename + no + global.config.defaults.defaultXLExtension;
            //global.ConsoleLog("file name" + filename);

            var workbook1 = new global.exceljs.Workbook();
            // var count = 0;
            //global.ConsoleLog(foldername + '/test1.xlsx');
            // global.ConsoleLog(fileExists('/test1.xlsx'));
            // global.ConsoleLog(fileExists('/test3.xlsx'));
            // workbook1.xlsx.readFile(foldername + '/test1.xlsx' ).then(function(){
            //     workbook1.eachSheet(function(worksheet, sheetId) {
            //     // ...
            //     count++;
            //     //global.ConsoleLog(worksheet);
            //     //global.ConsoleLog(workbook.getWorksheet());
            //     //global.ConsoleLog(workbook.getWorksheet(sheetId));
            //   });
            //   workbook1.addWorksheet(header.invoiceno);


            //   global.ConsoleLog(count);

            // });

            // var workbook2 = new global.exceljs.Workbook();
             var ws1 = workbook1.addWorksheet("Testing 1");
              ws1.addRow(["Address","Place"]);
              ws1.addRow(["Population", "count"]);
              ws1.addRow(["gen", "animal", "plants"]);
              ws1.addRow(["Date", "1111-11-11 11:11:11"]);
              ws1.addRow();
            // var ws2 = workbook2.addWorksheet("Testing 2");
              // ws2.addRow(["Address","Place"]);
              // ws2.addRow(["Population", "count"]);
              // ws2.addRow(["gen", "animal", "plants"]);
              // ws2.addRow(["Date", "1111-11-11 11:11:11"]);
              // ws2.addRow();

              // global.ConsoleLog(workbook.getWorksheet())

            var lineno = 1;
            var list = [];

            details.forEach
            (
              function(r)
              {
                //global.ConsoleLog(r);
                list.push([r.price,r.gst,r.qty,r.discount,r.expressfee]);
                var p = __.toBigNum(r.price);
                var g = __.toBigNum(r.gst);
                var q = __.toBigNum(r.qty);
                var d = __.toBigNum(r.discount);
                var f = __.toBigNum(r.expressfee);
                var t1 = p.times(q);
                var t2 = g.times(q);
                // ws2.addRow(r);
                
                // Discount and express fee...
                // +GST
                var subd = t1.times(d).div(100.0);
                var subf = t1.times(f).div(100.0);
                // -GST
                var subgstd = t2.times(d).div(100.0);
                var subgstf = t2.times(f).div(100.0);

                var subgst = t2.plus(subgstf).minus(subgstd);
                var subex = t1.plus(subf).minus(subd);
                var subinc = subgst.plus(subex);

                /*
                console.log( __.formatnumber(p, 4));
                console.log( __.formatnumber(q, 4));
                console.log( __.formatnumber(qu, 4));

                console.log( __.formatnumber(subgst, 4));
                console.log( __.formatnumber(subex, 4));
                console.log( __.formatnumber(subinc, 4));

                console.log( __.formatnumber(subgst, 2));
                console.log( __.formatnumber(subex, 2));
                console.log( __.formatnumber(subinc, 2));
                */

                totalgst = totalgst.plus(subgst);
                totalex = totalex.plus(subex);
                totalinc = totalinc.plus(subinc);

                //list.push(r.price,r.gst,r.qty,r.discount,r.expressfee);
                // global.ConsoleLog(list);

                /*
                products.push
                (
                  {
                    lineno: lineno++,
                    code: d.productcode,
                    name: d.productname,
                    unit: '',
                    gst: __.niceformatnumber(d.gst, 2),
                    qty: __.niceformatnumber(d.qty, 2),
                    price: __.niceformatnumber(d.price, 2),
                    subtotal: __.niceformatnumber(subex, 2)
                  }
                );
                */
                products.push
                (
                  {
                    lineno: lineno++,
                    code: r.productcode,
                    name: r.productname,
                    price: __.niceformatnumber(r.price, 2),
                    gst: __.niceformatnumber(r.gst, 2),
                    qty: __.niceformatnumber(r.qty, 2),
                    discount: __.niceformatnumber(r.discount, 2),
                    expressfee: __.niceformatnumber(r.expressfee, 2),
                    subtotal: __.niceformatnumber(subex, 2),
                    subtotalgst: __.niceformatnumber(subgst, 2)
                  }
                );
              }
            );

            //ws2.addRow(list);
           

            global.ConsoleLog(products);

            // console.log(products);
            var values =
            {
              orderinvoiceno: __.sanitiseAsString(header.invoiceno),
              orderorderno: __.sanitiseAsString(header.orderno),
              custpo: __.sanitiseAsString(header.pono),
              orderinvoicedate: global.moment(__.sanitiseAsString(header.invoicedate)).format('LL'),
              orderstartdate: global.moment(__.sanitiseAsString(header.datecreated)).format('LL'),

              custname: __.isBlank(header.ordername) ? __.sanitiseAsString(header.clientname) : __.sanitiseAsString(header.ordername),
              custvendorcode: __.sanitiseAsString(header.clientcode),

              custcontact1: __.sanitiseAsString(header.clientcontact1),
              custcontact2: __.sanitiseAsString(header.clientcontact2),

              custshipnotes: '',

              custaddress1: __.sanitiseAsString(header.invoicetoaddress1),
              custaddress2: __.sanitiseAsString(header.invoicetoaddress2),
              custcity: __.sanitiseAsString(header.invoicetocity),
              custpostcode: __.sanitiseAsString(header.invoicetopostcode),
              custstate: __.sanitiseAsString(header.invoicetostate),
              custcountry: __.sanitiseAsString(header.invoicetocountry),

              custaddress1: __.sanitiseAsString(header.shiptoaddress1),
              custaddress2: __.sanitiseAsString(header.shiptoaddress2),
              custcity: __.sanitiseAsString(header.shiptocity),
              custpostcode: __.sanitiseAsString(header.shiptopostcode),
              custstate: __.sanitiseAsString(header.shiptostate),
              custcountry: __.sanitiseAsString(header.shiptocountry),

              custacn: __.sanitiseAsString(header.clientacn),
              custabn: __.sanitiseAsString(header.clientabn),
              custhscode: __.sanitiseAsString(header.clienthscode),
              custcustcode1: __.sanitiseAsString(header.clientcustcode1),
              custcustcode2: __.sanitiseAsString(header.clientcustcode2),

              prepearedby: __.sanitiseAsString(uname),
              orderrevno: header.activeversion,
              orderrevdate: __.sanitiseAsString(header.datemodified),

              ordertotal: __.niceformatnumber(totalex, 2),
              orderdeliveryfee: '',
              ordergstamount: __.niceformatnumber(totalgst, 2),
              orderincgst: __.niceformatnumber(totalinc, 2),
              orderapplied: '',
              ordergrandtotal: __.niceformatnumber(totalinc, 2),

              product: products
            };

            template.substitute(sheetno, values);
            blob = template.generate();
            var workbook2 = new global.exceljs.Workbook();
            workbook2.xlsx.readFile(foldername + '/test1.xlsx')
              .then(function() {
                  var worksheet = workbook2.getWorksheet(3);
                  global.ConsoleLog(list);
                  worksheet.addRow(['price','gst','qty','discount','expressfee'])
                  worksheet.addRows(list);
                  worksheet.addRows(products);
                  // var row = worksheet.getRow(5);
                  // row.getCell(1).value = 5; // A5's value set to 5
                  //worksheet.commit();
                  return workbook2.xlsx.writeFile(foldername + '/test1.xlsx');
              });

            ensureFolderExists
            (
              foldername,
              0775,
              function(err)
              {
                if (!err)
                {
                  fs.writeFile
                  (
                    foldername + '/' + filename,
                    blob,
                    'binary',
                    function(err)
                    {
                      if (!err)
                        // var path = foldername + '/' + filename;
                        workbook1.xlsx.writeFile(foldername + '/test2.xlsx' ).then(function(){
                          global.ConsoleLog(foldername + '/' + filename);
                          resolve({orderno: header.orderno, invoiceno: header.invoiceno, basename: filename, fullpath: foldername + '/' + filename});
                        });
                        //resolve({orderno: header.orderno, invoiceno: header.invoiceno, basename: filename, fullpath: foldername + '/' + filename});
                      else
                        reject(err);
                    }
                  );
                }
                else
                  reject(err);
              }
            );
          }
          else
            reject(err);
        }
      );
    }
  );
  return promise;
}

// *******************************************************************************************************************************************************************************************
// Public functions
function PrintInvoices(world)
{
  var msg = '[' + world.eventname + '] ';
  //global.ConsoleLog("print invoices");
  //global.ConsoleLog(world.custconfig.invoiceprinttemplateid);
  //
  global.pg.connect
  (
    global.cs,
    function(err, client, done)
    {
      if (!err)
      {
        var tx = new global.pgtx(client);
        tx.begin
        (
          function(err)
          {
            if (!err)
            {
              var calls = [];
              //global.ConsoleLog("invoices");
              //global.ConsoleLog(world.orders);

              world.orders.forEach
              (
                function(orderid)
                {
                  calls.push
                  (
                    function(callback)
                    {
                      var header = {};
                      var details = [];
                      var ordertemplate = '';

                      doGetOrderHeader(tx, world.cn.custid, orderid).then
                      (
                        function(result)
                        {
                          header = result;
                          return doGetOrderDetails(tx, world.cn.custid, header);
                        }
                      ).then
                      (
                        function(result)
                        {
                          details = result;
                          return doGetLastPrintNo(tx, world.cn.custid, orderid);
                        }
                      ).then
                      (
                        function(copyno)
                        {
                          return doSetLastPrintNo(tx, world.cn.custid, world.cn.userid, orderid, copyno);
                        }
                      ).then
                      (
                        function(ignore)
                        {
                          return doGetInvoiceTemplate(tx, world.cn.custid, header, world.custconfig.invoiceprinttemplateid);
                        }
                      ).then

                      (
                        function(ordertemplate)
                        {
                          // global.ConsoleLog(ordertemplate);
                          // global.ConsoleLog('header');
                          // global.ConsoleLog(header);
                          return doGenOrder(tx, world.cn.custid, header, details, ordertemplate, world.cn.uname);
                        }
                      ).then
                      (
                        function(xlsx)
                        {
                          callback(null, xlsx);
                        }
                      ).then
                      (
                        null,
                        function(err)
                        {
                          callback(err);
                        }
                      )
                    }
                  );
                }
              );

              global.async.series
              (
                calls,
                function(err, results)
                {
                  if (!err)
                  {
                    tx.commit
                    (
                      function(err)
                      {
                        if (!err)
                        {
                          done();

                          world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, rs: results, pdata: world.pdata});
                        }
                      }
                    );
                  }
                  else
                  {
                    tx.rollback
                    (
                      function(ignore)
                      {
                        done();
                        msg += global.text_tx + ' ' + err.message;
                        global.log.error({printinvoices: true}, msg);
                        world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
                      }
                    );
                  }
                }
              );
            }
            else
            {
              done();
              msg += global.text_notxstart + ' ' + err.message;
              global.log.error({printinvoices: true}, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
            }
          }
        );
      }
      else
      {
        global.log.error({printinvoices: true}, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
      }
    }
  );
}

function PrintOrders(world)
{
  // global.ConsoleLog("Print Orders");
  // global.ConsoleLog(world.custconfig.orderprinttemplateid);
  //global.ConsoleLog(world);
  var msg = '[' + world.eventname + '] ';
  //
  global.pg.connect
  (
    global.cs,
    function(err, client, done)
    {
      if (!err)
      {
        var tx = new global.pgtx(client);
        tx.begin
        (
          function(err)
          {
            if (!err)
            {
              var calls = [];
              

              world.orders.forEach
              (
                
                function(orderid)
                {
                  global.ConsoleLog(orderid);
                  calls.push
                  (
                    function(callback)
                    {
                      var header = {};
                      var details = [];

                      doGetOrderHeader(tx, world.cn.custid, orderid).then
                      (
                        function(result)
                        {
                          header = result;
                          return doGetOrderDetails(tx, world.cn.custid, header);
                        }
                      ).then
                      (
                        function(result)
                        {
                          details = result;
                          return doGetLastPrintNo(tx, world.cn.custid, orderid);
                        }
                      ).then
                      (
                        function(copyno)
                        {
                          return doSetLastPrintNo(tx, world.cn.custid, world.cn.userid, orderid, copyno);
                        }
                      ).then
                      (
                        function(result)
                        {
                           world.copyno = result;
                          return doGetOrderTemplate(tx, world.cn.custid, header, world.custconfig.orderprinttemplateid);
                        }
                      ).then
                      (
                        function(ordertemplate)
                        {
                          // global.ConsoleLog(ordertemplate);
                          // global.ConsoleLog('header');
                          // global.ConsoleLog(header);
                          return doGenOrder(tx, world.cn.custid, header, details, ordertemplate, world.cn.uname);
                        }
                      ).then
                      (
                        function(xlsx)
                        {
                          callback(null, xlsx);
                        }
                      ).then
                      (
                        null,
                        function(err)
                        {
                          callback(err);
                        }
                      )
                    }
                  );
                }
              );

              global.async.series
              (
                calls,
                function(err, results)
                {
                  if (!err)
                  {
                    tx.commit
                    (
                      function(err)
                      {
                        if (!err)
                        {
                          done();
                          // global.ConsoleLog('event name');
                          // global.ConsoleLog(world.eventname);
                          world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, rs: results, pdata: world.pdata});
                        }
                      }
                    );
                  }
                  else
                  {
                    tx.rollback
                    (
                      function(ignore)
                      {
                        done();
                        msg += global.text_tx + ' ' + err.message;
                        global.log.error({printorders: true}, msg);
                        world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
                      }
                    );
                  }
                }
              );
            }
            else
            {
              done();
              msg += global.text_notxstart + ' ' + err.message;
              global.log.error({printorders: true}, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
            }
          }
        );
      }
      else
      {
        global.log.error({printorders: true}, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
      }
    }
  );
}

function PrintDeliveryDockets(world)
{
  var msg = '[' + world.eventname + '] ';
  //
  global.pg.connect
  (
    global.cs,
    function(err, client, done)
    {
      if (!err)
      {
        var tx = new global.pgtx(client);
        tx.begin
        (
          function(err)
          {
            if (!err)
            {
              var calls = [];

              world.orders.forEach
              (
                function(orderid)
                {
                  calls.push
                  (
                    function(callback)
                    {
                      var header = {};
                      var details = [];

                      doGetOrderHeader(tx, world.cn.custid, orderid).then
                      (
                        function(result)
                        {
                          header = result;
                          return doGetOrderDetails(tx, world.cn.custid, header);
                        }
                      ).then
                      (
                        function(result)
                        {
                          details = result;
                          return doGetDeliveryDocketTemplate(tx, world.cn.custid, header);
                        }
                      ).then
                      (
                        function(ordertemplate)
                        {
                          return doGenOrder(tx, world.cn.custid, header, details, ordertemplate, world.cn.uname);
                        }
                      ).then
                      (
                        function(xlsx)
                        {
                          callback(null, xlsx);
                        }
                      ).then
                      (
                        null,
                        function(err)
                        {
                          callback(err);
                        }
                      )
                    }
                  );
                }
              );

              global.async.series
              (
                calls,
                function(err, results)
                {
                  if (!err)
                  {
                    tx.commit
                    (
                      function(err)
                      {
                        if (!err)
                        {
                          done();

                          world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, rs: results, pdata: world.pdata});
                        }
                      }
                    );
                  }
                  else
                  {
                    tx.rollback
                    (
                      function(ignore)
                      {
                        done();
                        msg += global.text_tx + ' ' + err.message;
                        global.log.error({printdeliverydockets: true}, msg);
                        world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
                      }
                    );
                  }
                }
              );
            }
            else
            {
              done();
              msg += global.text_notxstart + ' ' + err.message;
              global.log.error({printdeliverydockets: true}, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
            }
          }
        );
      }
      else
      {
        global.log.error({printdeliverydockets: true}, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
      }
    }
  );
}

function PrintQuotes(world)
{
  var msg = '[' + world.eventname + '] ';
  //
  global.pg.connect
  (
    global.cs,
    function(err, client, done)
    {
      if (!err)
      {
        var tx = new global.pgtx(client);
        tx.begin
        (
          function(err)
          {
            if (!err)
            {
              var calls = [];

              world.orders.forEach
              (
                function(orderid)
                {
                  calls.push
                  (
                    function(callback)
                    {
                      var header = {};
                      var details = [];

                      doGetOrderHeader(tx, world.cn.custid, orderid).then
                      (
                        function(result)
                        {
                          header = result;
                          return doGetOrderDetails(tx, world.cn.custid, header);
                        }
                      ).then
                      (
                        function(result)
                        {
                          details = result;
                          return doGetQuoteTemplate(tx, world.cn.custid, header);
                        }
                      ).then
                      (
                        function(ordertemplate)
                        {
                          return doGenOrder(tx, world.cn.custid, header, details, ordertemplate, world.cn.uname);
                        }
                      ).then
                      (
                        function(xlsx)
                        {
                          callback(null, xlsx);
                        }
                      ).then
                      (
                        null,
                        function(err)
                        {
                          callback(err);
                        }
                      )
                    }
                  );
                }
              );

              global.async.series
              (
                calls,
                function(err, results)
                {
                  if (!err)
                  {
                    tx.commit
                    (
                      function(err)
                      {
                        if (!err)
                        {
                          done();

                          world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, rs: results, pdata: world.pdata});
                        }
                      }
                    );
                  }
                  else
                  {
                    tx.rollback
                    (
                      function(ignore)
                      {
                        done();
                        msg += global.text_tx + ' ' + err.message;
                        global.log.error({printquotes: true}, msg);
                        world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
                      }
                    );
                  }
                }
              );
            }
            else
            {
              done();
              msg += global.text_notxstart + ' ' + err.message;
              global.log.error({printquotes: true}, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
            }
          }
        );
      }
      else
      {
        global.log.error({printquotes: true}, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
      }
    }
  );
}

function SendInvoice(req, res)
{
  // global.ConsoleLog("Send Invoice");
  // global.ConsoleLog(req.query.no);
  // global.ConsoleLog(res);
  if (!__.isUN(req.query.no))
  {
    // TODO: look up FGUID make sure it's valid, also use that to determine customers_id etc...
    global.modinvoices.doGetCustIdFromInvoiceNo(req.query.no).then
    (
      function(result)
      {
        //var foldername = global.config.folders.orders + result.customerid;
        var foldername = global.path.join(__dirname, global.config.folders.invoices + result.customerid);
        //global.ConsoleLog(foldername);
        var filename = global.config.defaults.defaultPrefixInvoiceFilename + req.query.no + global.config.defaults.defaultXLExtension;
        var xl = foldername + '/' + filename;
        //global.ConsoleLog(xl);

        res.setHeader('Content-disposition', 'attachment; filename=' + filename);
        res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.sendFile(xl);
      }
    ).then
    (
      null,
      function(err)
      {
        res.sendFile('./routes/nosuchorder.html');
      }
    );
  }
  else
    res.sendFile('./routes/nosuchorder.html');
}

function SendOrder(req, res)
{
  //global.ConsoleLog("Send Order");
  // global.ConsoleLog(req);
  //global.ConsoleLog(req.query.no);
  if (!__.isUN(req.query.no))
  {
    // TODO: look up FGUID make sure it's valid, also use that to determine customers_id etc...
    global.modorders.doGetCustIdFromOrderNo(req.query.no).then
    (
      function(result)
      {
        var foldername = global.path.join(__dirname, global.config.folders.orders + result.customerid);
        //global.ConsoleLog(foldername);
        var filename = global.config.defaults.defaultPrefixOrderFilename + req.query.no + global.config.defaults.defaultXLExtension;
        var xl = foldername + '/' + filename;
        //global.ConsoleLog(xl);
        //global.ConsoleLog(res.getHeaders());

        res.setHeader('Content-disposition', 'attachment; filename=' + filename);
        res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        //global.ConsoleLog(res.getHeaders());
        res.sendFile(xl);
      }
    ).then
    (
      null,
      function(err)
      {
        res.sendFile('./routes/nosuchorder.html');
      }
    );
  }
  else
    res.sendFile('./routes/nosuchorder.html');
}

function SendJobSheet(req, res)
{
  if (!__.isUN(req.query.no))
  {
    // TODO: look up FGUID make sure it's valid, also use that to determine customers_id etc...
    global.modtpcc.doGetCustIdFromJobSheetNo(req.query.no).then
    (
      function(result)
      {
        var foldername = global.config.folders.jobsheets + result.customerid;
        var filename = global.config.defaults.defaultPrefixJobSheetFilename + req.query.no + global.config.defaults.defaultXLExtension;
        var xl = foldername + '/' + filename;

        res.setHeader('Content-disposition', 'attachment; filename=' + filename);
        res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.sendfile(xl);
      }
    ).then
    (
      null,
      function(err)
      {
        res.sendfile('./routes/nojobsheet.html');
      }
    );
  }
  else
    res.sendfile('./routes/nojobsheet.html');
}

function EmailOrder(world)
{
  var msg = '[' + world.eventname + '] ';
  //
  global.pg.connect
  (
    global.cs,
    function(err, client, done)
    {
      if (!err)
      {
        var tx = new global.pgtx(client);
        tx.begin
        (
          function(err)
          {
            if (!err)
            {
              var header = {};
              var details = [];
              var xlsx = '';

              doGetOrderHeader(tx, world.cn.custid, world.orderid).then
              (
                function(result)
                {
                  header = result;
                  return doGetOrderDetails(tx, world.cn.custid, header);
                }
              ).then
              (
                function(result)
                {
                  details = result;

                  return doGetOrderTemplate(tx, world.cn.custid, header, world.custconfig.orderprinttemplateid);
                }
              ).then
              (
                function(result)
                {
                  return doGenOrder(tx, world.cn.custid, header, details, result, world.cn.uname);
                }
              ).then
              (
                function(result)
                {
                  xlsx = result;
                  return doGetLastEmailNo(tx, world.cn.custid, world.orderid);
                }
              ).then
              (
                function(result)
                {
                  world.copyno = result;
                  return doSaveEmail(tx, world);
                }
              ).then
              (
                function(result)
                {
                  tx.commit
                  (
                    function(err)
                    {
                      if (!err)
                      {
                        done();

                        var transporter = createSMTPTransport();

                        transporter.sendMail
                        (
                          {
                            from: global.config.smtp.returnmail,
                            to: world.recipients,
                            subject: world.subject + ' - Copy #' + world.copyno,
                            html: world.message,
                            attachments:
                            [
                              {
                                filename: xlsx.basename,
                                path: xlsx.fullpath
                              }
                            ]
                          },
                          function(err, info)
                          {
                            if (!err)
                            {
                              world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, pdata: world.pdata});
                              global.pr.sendToRoomExcept
                              (
                                global.custchannelprefix + world.cn.custid,
                                'emailsent',
                                {
                                  emailid: result.emailid,
                                  datecreated: result.datecreated,
                                  usercreated: result.usercreated
                                },
                                world.spark.id
                              );
                            }
                            else
                            {
                              msg += global.text_tx + ' ' + err.message;
                              global.log.error({emailorder: true}, msg);
                            }

                            if (!__.isUndefined(info))
                              global.log.info({emailorder: true}, info);
                          }
                        );
                      }
                      else
                      {
                        tx.rollback
                        (
                          function(ignore)
                          {
                            done();
                            msg += global.text_tx + ' ' + err.message;
                            global.log.error({emailorder: true}, msg);
                            world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
                          }
                        );
                      }
                    }
                  );
                }
              ).then
              (
                null,
                function(err)
                {
                  tx.rollback
                  (
                    function(ignore)
                    {
                      done();
                      msg += global.text_tx + ' ' + err.message;
                      global.log.error({emailorder: true}, msg);
                      world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
                    }
                  );
                }
              );
            }
            else
            {
              done();
              msg += global.text_notxstart + ' ' + err.message;
              global.log.error({emailorder: true}, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
            }
          }
        );
      }
      else
      {
        global.log.error({emailorder: true}, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
      }
    }
  );
}

function EmailInvoice(world)
{
  var msg = '[' + world.eventname + '] ';
  //
  global.pg.connect
  (
    global.cs,
    function(err, client, done)
    {
      if (!err)
      {
        var tx = new global.pgtx(client);
        tx.begin
        (
          function(err)
          {
            if (!err)
            {
              var header = {};
              var details = [];
              var xlsx = '';

              doGetOrderHeader(tx, world.cn.custid, world.orderid).then
              (
                function(result)
                {
                  header = result;
                  return doGetOrderDetails(tx, world.cn.custid, header);
                }
              ).then
              (
                function(result)
                {
                  details = result;

                  return doGetInvoiceTemplate(tx, world.cn.custid, header, world.custconfig.invoiceprinttemplateid);
                }
              ).then
              (
                function(result)
                {
                  return doGenOrder(tx, world.cn.custid, header, details, result, world.cn.uname);
                }
              ).then
              (
                function(result)
                {
                  xlsx = result;
                  return doGetLastEmailNo(tx, world.cn.custid, world.orderid);
                }
              ).then
              (
                function(result)
                {
                  world.copyno = result;
                  return doSaveEmail(tx, world);
                }
              ).then
              (
                function(result)
                {
                  tx.commit
                  (
                    function(err)
                    {
                      if (!err)
                      {
                        done();

                        var transporter = createSMTPTransport();

                        transporter.sendMail
                        (
                          {
                            from: global.config.smtp.returnmail,
                            to: world.recipients,
                            subject: world.subject,
                            html: world.message,
                            attachments:
                            [
                              {
                                filename: xlsx.basename,
                                path: xlsx.fullpath
                              }
                            ]
                          },
                          function(err, info)
                          {
                            if (!err)
                            {
                              world.spark.emit(world.eventname, {rc: global.errcode_none, msg: global.text_success, pdata: world.pdata});
                              global.pr.sendToRoomExcept
                              (
                                global.custchannelprefix + world.cn.custid,
                                'emailsent',
                                {
                                  emailid: result.emailid,
                                  datecreated: result.datecreated,
                                  usercreated: result.usercreated
                                },
                                world.spark.id
                              );
                            }
                            else
                            {
                              msg += global.text_tx + ' ' + err.message;
                              global.log.error({emailinvoice: true}, msg);
                            }

                            if (!__.isUndefined(info))
                              global.log.info({emailinvoice: true}, info);
                          }
                        );
                      }
                      else
                      {
                        tx.rollback
                        (
                          function(ignore)
                          {
                            done();
                            msg += global.text_tx + ' ' + err.message;
                            global.log.error({emailinvoice: true}, msg);
                            world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
                          }
                        );
                      }
                    }
                  );
                }
              ).then
              (
                null,
                function(err)
                {
                  tx.rollback
                  (
                    function(ignore)
                    {
                      done();
                      msg += global.text_tx + ' ' + err.message;
                      global.log.error({emailinvoice: true}, msg);
                      world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
                    }
                  );
                }
              );
            }
            else
            {
              done();
              msg += global.text_notxstart + ' ' + err.message;
              global.log.error({emailinvoice: true}, msg);
              world.spark.emit(global.eventerror, {rc: global.errcode_dberr, msg: msg, pdata: world.pdata});
            }
          }
        );
      }
      else
      {
        global.log.error({emailinvoice: true}, global.text_nodbconnection);
        world.spark.emit(global.eventerror, {rc: global.errcode_dbunavail, msg: global.text_nodbconnection, pdata: world.pdata});
      }
    }
  );
}

function GetRfidTaps(req, res)
{
  //
  global.pg.connect
  (
    global.cs,
    function(err, client, done)
    {
      if (!err)
      {
        doGetTimeClockPeriodFromToday(global.config.defaults.defaultpaydow).then
        (
          function(result)
          {
            return doCalcPayrollFromRtap(client, result.lastpayday, result.today);
          }
        ).then
        (
          function(result)
          {
            done();
            fs.readFile
            (
              global.config.folders.templates + global.config.env.taptemplate,
              function(err, data)
              {
                if (!err)
                {
                  var sheetno = 1;
                  var blob = null;
                  var template = new global.xlwriter(data);
                  var filename = 'TA_' + global.moment().format('YYYY-MM-DD') + '.xlsx';

                  // Generate the Excel...
                  template.substitute(sheetno, result);
                  blob = template.generate();
                  fs.writeFileSync(global.path.join(__dirname, global.config.folders.timesheets + filename), blob, 'binary');

                  // Re-read completed version and send to caller...
                  var xl = global.fs.readFileSync(global.path.join(__dirname, global.config.folders.timesheets + filename));
                  res.setHeader('Content-disposition', 'attachment; filename=' + filename);
                  res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                  res.send(xl);
                }
              }
            );
          }
        ).then
        (
          null,
          function(err)
          {
            done();
            global.log.error({getrfidtaps: true}, err.message);
            res.sendfile('./routes/notags.html');
          }
        );
      }
      else
      {
        global.log.error({getrfidtaps: true}, global.text_nodbconnection);
        res.sendfile('./routes/notags.html');
      }
    }
  );
}

function GetRfidTapPeriod(req, res)
{
  //
  global.pg.connect
  (
    global.cs,
    function(err, client, done)
    {
      if (!err)
      {
        var datefrom = global.moment(req.query.startdate);
        var dateto = global.moment(req.query.enddate);

        return doCalcPayrollFromRtap(client, datefrom, dateto).then
        (
          function(result)
          {
            done();
            fs.readFile
            (
              global.config.folders.templates + global.config.env.taptemplate,
              function(err, data)
              {
                if (!err)
                {
                  var sheetno = 1;
                  var blob = null;
                  var template = new global.xlwriter(data);
                  var filename = 'TA_' + global.moment().format('YYYY-MM-DD') + '.xlsx';

                  // Generate the Excel...
                  template.substitute(sheetno, result);
                  blob = template.generate();
                  fs.writeFileSync(global.path.join(__dirname, global.config.folders.timesheets + filename), blob, 'binary');

                  // Re-read completed version and send to caller...
                  var xl = global.fs.readFileSync(global.path.join(__dirname, global.config.folders.timesheets + filename));
                  res.setHeader('Content-disposition', 'attachment; filename=' + filename);
                  res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                  res.send(xl);
                }
              }
            );
          }
        ).then
        (
          null,
          function(err)
          {
            done();
            global.log.error({getrfidtapperiod: true}, msg);
            res.sendfile('./routes/notags.html');
          }
        );
      }
      else
      {
        global.log.error({getrfidtapperiod: true}, global.text_nodbconnection);
        res.sendfile('./routes/notags.html');
      }
    }
  );
}

function EmailRfidTaps()
{
  //
  global.pg.connect
  (
    global.cs,
    function(err, client, done)
    {
      if (!err)
      {
        var fromdate = '';
        var todate = '';

        doGetTimeClockPeriodFromToday(global.config.env.defaultpaydow).then
        (
          function(result)
          {
            fromdate = result.lastpayday.format('YYYY-MM-DD');
            todate = result.today.format('YYYY-MM-DD');
            return doCalcPayrollFromRtap(client, result.lastpayday, result.today);
          }
        ).then
        (
          function(result)
          {
            done();
            fs.readFile
            (
              global.config.folders.templates + global.config.env.taptemplate,
              function(err, data)
              {
                if (!err)
                {
                  var sheetno = 1;
                  var blob = null;
                  var template = new global.xlwriter(data);
                  var filename = 'TA_' + todate + '.xlsx';
                  var transporter = createSMTPTransport();

                  // Generate the Excel...
                  template.substitute(sheetno, result);
                  blob = template.generate();
                  fs.writeFileSync(global.path.join(__dirname, global.config.folders.timesheets + filename), blob, 'binary');

                  transporter.sendMail
                  (
                    {
                      from: global.config.smtp.returnmail,
                      to: global.config.env.emailtaps,
                      subject: 'Big Accounting Time Data',
                      html: 'Big Accounting Time Data from <strong>' + fromdate + '</strong> to <strong>' + todate + '</strong>',
                      attachments:
                      [
                        {
                          filename: filename,
                          path: global.path.join(__dirname, global.config.folders.timesheets + filename)
                        }
                      ]
                    },
                    function(err, info)
                    {
                      console.log(err);
                      console.log(info);
                    }
                  );
                }
              }
            );
          }
        ).then
        (
          null,
          function(err)
          {
            done();
            global.log.error({emailrfidtaps: true}, msg);
          }
        );
      }
      else
        global.log.error({emailrfidtaps: true}, global.text_nodbconnection);
    }
  );
}

// *******************************************************************************************************************************************************************************************
// Internal functions
module.exports.doGetOrderHeader = doGetOrderHeader;

// *******************************************************************************************************************************************************************************************
// Public functions
module.exports.PrintInvoices = PrintInvoices;
module.exports.PrintOrders= PrintOrders;
module.exports.PrintDeliveryDockets= PrintDeliveryDockets;
module.exports.PrintQuotes= PrintQuotes;

module.exports.SendOrder = SendOrder;
module.exports.SendJobSheet = SendJobSheet;
module.exports.SendInvoice = SendInvoice;

module.exports.EmailOrder = EmailOrder;
module.exports.EmailInvoice = EmailInvoice;

module.exports.GetRfidTaps = GetRfidTaps;
module.exports.GetRfidTapPeriod = GetRfidTapPeriod;
module.exports.EmailRfidTaps = EmailRfidTaps;
