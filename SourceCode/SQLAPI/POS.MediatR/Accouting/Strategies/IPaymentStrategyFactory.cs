using Microsoft.Extensions.DependencyInjection;
using POS.Data.Dto;
using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using System;


namespace POS.MediatR.Accouting.Strategies;

public interface IPaymentStrategyFactory
{
    IPaymentStrategy GetStrategy(PaymentDto paymentDto, Transaction transaction);
    //IPaymentStrategy GetStrategy(ACCPaymentMethod paymentMethod);
}

public class PaymentStrategyFactory : IPaymentStrategyFactory
{
    private readonly IServiceProvider _serviceProvider;

    public PaymentStrategyFactory(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public IPaymentStrategy GetStrategy(PaymentDto paymentDto, Transaction transaction)
    {
        // Partial payment strategy (amount less than total or explicitly marked as partial)
        var roundedTotal = Math.Round(paymentDto.Amount, 0) + Math.Round(transaction.ReturnItemsAmount);
        //if (paymentDto.Amount < transaction.TotalAmount)
        //{
        //    return _serviceProvider.GetRequiredService<IPartialPaymentStrategy>();
        //}
        //if (roundedTotal < Math.Round(transaction.TotalAmount))
        //{
        //    return _serviceProvider.GetRequiredService<IPartialPaymentStrategy>();
        //}

        // Default to full payment strategy
        return _serviceProvider.GetRequiredService<IFullPaymentStrategy>();
    }

    //public IPaymentStrategy GetStrategy(ACCPaymentMethod paymentMethod)
    //{

    //    if (paymentMethod == ACCPaymentMethod.Partial)
    //    {
    //        return _serviceProvider.GetRequiredService<IPartialPaymentStrategy>();
    //    }

    //    return _serviceProvider.GetRequiredService<IFullPaymentStrategy>();
    //}
}