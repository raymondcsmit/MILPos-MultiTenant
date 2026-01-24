using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using POS.Helper;

namespace POS.Repository
{
    public interface IEmailRepository
    {
        Task<bool> SendEmail(SendEmailSpecification sendEmailSpecification);
    }
}
