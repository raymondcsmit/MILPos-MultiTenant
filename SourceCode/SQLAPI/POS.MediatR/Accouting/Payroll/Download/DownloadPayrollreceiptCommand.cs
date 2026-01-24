using MediatR;
using POS.Data.Dto.Acconting;
using POS.Helper;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting
{
    public class DownloadPayrollreceiptCommand:IRequest<string>
    {
        public string AttachmentName {  get; set; }
    }
}
