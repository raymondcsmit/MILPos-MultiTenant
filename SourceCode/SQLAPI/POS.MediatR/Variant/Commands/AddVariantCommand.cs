using MediatR;
using POS.Data.Dto;
using POS.Helper;
using System;
using System.Collections.Generic;


namespace POS.MediatR
{
    public class AddVariantCommand : IRequest<ServiceResponse<VariantDto>>
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public List<VariantItemDto> VariantItems { get; set; }
    }
}
