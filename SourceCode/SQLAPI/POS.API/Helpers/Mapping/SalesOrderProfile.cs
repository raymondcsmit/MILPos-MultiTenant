using AutoMapper;
using POS.Data.Dto;
using POS.Data;
using POS.MediatR.CommandAndQuery;
using POS.MediatR;
using POS.MediatR.SalesOrder.Commands;
using POS.MediatR.SalesOrderPayment.Command;

namespace POS.API.Helpers.Mapping
{
    public class SalesOrderProfile : Profile
    {
        public SalesOrderProfile()
        {
            CreateMap<SalesOrderDto, SalesOrder>().ReverseMap().ForMember(dest => dest.CreatedByName,
                                opt => opt
                                .MapFrom(src => src.CreatedByUser != null ? $"{src.CreatedByUser.FirstName} {src.CreatedByUser.LastName}" : ""));
			CreateMap<UpdateSalesOrderReturnCommand, SalesOrder>();
            CreateMap<AddSalesOrderCommand, SalesOrder>();
            CreateMap<SalesOrderItem, SalesOrderItemDto>().ReverseMap();
            CreateMap<SalesOrderItemTax, SalesOrderItemTaxDto>()
                 .ForMember(dest => dest.TaxName,
                    opt => opt.MapFrom(src => src.Tax != null ? src.Tax.Name : ""))
                 .ForMember(dest => dest.TaxPercentage,
                    opt => opt.MapFrom(src => src.Tax != null ? src.Tax.Percentage : 0))
                 .ReverseMap();
            CreateMap<UpdateSalesOrderCommand, SalesOrder>();
            CreateMap<SalesOrderPayment, SalesOrderPaymentDto>().ReverseMap();
            CreateMap<AddSalesOrderPaymentCommand, SalesOrderPayment>();
        }
    }
}
