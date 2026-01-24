namespace POS.Data
{
    public enum InventorySourceEnum
    {
        Direct = 0,
        PurchaseOrder = 1,
        SalesOrder = 2,
        PurchaseOrderReturn = 3,
        SalesOrderReturn = 4,
        DeletePurchaseOrder = 5,
        DeleteSalesOrder = 6,
		StockTransfer = 7,
        DamageStock = 8
    }
}
