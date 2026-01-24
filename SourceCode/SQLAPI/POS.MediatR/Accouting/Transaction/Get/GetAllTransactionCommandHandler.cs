using MediatR;
using POS.Repository;
using POS.Repository.Accouting;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace POS.MediatR.Accouting
{
    public class GetAllTransactionCommandHandler(
        ITransactionRepository _transactionRepository) : IRequestHandler<GetAllTransactionCommand, TransactionList>
    {
        public async Task<TransactionList> Handle(GetAllTransactionCommand request, CancellationToken cancellationToken)
        {
            return await _transactionRepository.GetTransactions(request.transactionResource);
        }
    }
}
