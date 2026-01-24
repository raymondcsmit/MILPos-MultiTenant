using MediatR;
using POS.Data.Dto;
using POS.Helper;

namespace POS.MediatR.Language.Commands
{
    public class AddLanguageCommand : IRequest<ServiceResponse<LanguageDto>>
    {
        public string Name { get; set; }
        public string Code { get; set; }
        public string LanguageImgSrc { get; set; }
        public bool Isrtl { get; set; }
        public int Order { get; set; }
        public bool IsLanguageImageUpload { get; set; }
        public string Codes { get; set; }
    }
}
