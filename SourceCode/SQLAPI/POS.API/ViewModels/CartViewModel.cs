using System;
using System.Collections.Generic;
using System.Linq;

namespace POS.API.ViewModels
{
    public class CartViewModel
    {
        public List<CartItemViewModel> Items { get; set; } = new List<CartItemViewModel>();
        public decimal TotalAmount => Items.Sum(i => i.Total);
    }

    public class CartItemViewModel
    {
        public Guid ProductId { get; set; }
        public string ProductName { get; set; }
        public decimal Price { get; set; }
        public int Quantity { get; set; }
        public string ImageUrl { get; set; }
        public decimal Total => Price * Quantity;
    }
}
