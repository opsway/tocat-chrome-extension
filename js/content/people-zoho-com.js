'use strict';

var table = {
    rowSelector: '.ZPLRow',
    userSelector: '.ZPusrName b'
  };

console.log('Content zoho hr! Hash: %s', window.location.hash);


chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.isAuth)
      init();
  });

function init() {
  table.body = document.getElementById('ZPAtt_attmonthlyReportTableBody');
  console.log('table: ', table);
}
