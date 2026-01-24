using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace POS.Helper
{
    public static class GenerateStockTransferNumber
    {
        public static string GenerateStockTransferNumberAsync(string referenceNo )
        {
            if (string.IsNullOrWhiteSpace(referenceNo))
            {
                return  "ST#00001";
            }

            var lastSoNumber = referenceNo;
            var soId = Regex.Match(lastSoNumber, @"\d+").Value;
            var isNumber = int.TryParse(soId, out int soNumber);
            if (isNumber)
            {
                var newPoId = lastSoNumber.Replace(soNumber.ToString(), "");
                return $"{newPoId}{soNumber + 1}";
            }
            else
            {
                 return  $"{lastSoNumber}#00001";
            }
        }
    }
}
