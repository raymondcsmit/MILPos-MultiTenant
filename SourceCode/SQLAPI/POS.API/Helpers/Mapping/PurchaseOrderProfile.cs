using AutoMapper;
using POS.Data.Dto;
using POS.Data;
using POS.MediatR.CommandAndQuery;
using POS.MediatR;
using POS.MediatR.PurchaseOrderPayment.Command;

namespace POS.API.Helpers.Mapping
{
    public class PurchaseOrderProfile : Profile
    {
        public PurchaseOrderProfile()
        {
            CreateMap<PurchaseOrder, PurchaseOrderDto>()
                .ForMember(dest => dest.CreatedByName,
                                opt => opt
                                .MapFrom(src => src.CreatedByUser != null ? $"{src.CreatedByUser.FirstName} {src.CreatedByUser.LastName}" : ""))
                .ReverseMap();
            CreateMap<AddPurchaseOrderCommand, PurchaseOrder>();
            CreateMap<PurchaseOrderItem, PurchaseOrderItemDto>().ReverseMap();
            CreateMap<PurchaseOrderItemTax, PurchaseOrderItemTaxDto>()
                .ForMember(dest => dest.TaxName, opt => opt
                                .MapFrom(src => src.Tax != null ? src.Tax.Name : ""))
                .ForMember(dest => dest.TaxPercentage, opt => opt
                                .MapFrom(src => src.Tax != null ? src.Tax.Percentage : 0))
                .ReverseMap();
            CreateMap<UpdatePurchaseOrderCommand, PurchaseOrder>();
            CreateMap<PurchaseOrderPayment, PurchaseOrderPaymentDto>().ReverseMap();
            CreateMap<AddPurchaseOrderPaymentCommand, PurchaseOrderPayment>();
            CreateMap<UpdatePurchaseOrderReturnCommand, PurchaseOrder>();
        }
    }
}
