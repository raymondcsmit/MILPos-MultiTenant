# POS Data Migration Utility

A C# console application that migrates data from SQL Server to SQLite database using Entity Framework Core.

## Features

- **Complete Data Migration**: Migrates all entities from the POS system including users, products, orders, transactions, etc.
- **Batch Processing**: Configurable batch size for efficient memory usage during large data transfers
- **Dependency Order**: Entities are migrated in the correct dependency order to maintain referential integrity
- **Deleted Records Filter**: Option to skip soft-deleted records during migration
- **Progress Tracking**: Real-time progress updates with batch completion status
- **Error Handling**: Comprehensive error handling with detailed error messages
- **Transaction Safety**: Each batch is saved in a separate transaction

## Configuration

The utility uses `appsettings.json` for configuration:

```json
{
  "ConnectionStrings": {
    "SqlServerConnection": "data source=localhost;Initial Catalog=POSDb;user id=sa;password=Admin@123;TrustServerCertificate=True;",
    "SqliteConnection": "Data Source=POSDb.db"
  },
  "MigrationSettings": {
    "BatchSize": 1000,
    "EnableLogging": true,
    "SkipDeletedRecords": true
  }
}
```

### Configuration Options

- **SqlServerConnection**: Connection string for the source SQL Server database
- **SqliteConnection**: Connection string for the target SQLite database
- **BatchSize**: Number of records to process in each batch (default: 1000)
- **EnableLogging**: Enable detailed logging during migration (default: true)
- **SkipDeletedRecords**: Skip records marked as deleted (default: true)

## Usage

### Build the Project

```bash
cd POS.DataMigrationUtility
dotnet build
```

### Run the Migration

```bash
dotnet run
```

The utility will:
1. Display a welcome message and configuration summary
2. Ask for confirmation before proceeding
3. **Recreate the target SQLite database (WARNING: Existing data in SQLite will be lost)**
4. Migrate data in dependency order with progress updates
5. Display completion status and any errors encountered

## Migration Order

The utility migrates entities in the following order to maintain referential integrity:

1. **Reference Data**: Countries, Currencies, Languages, Locations, Brands, Product Categories, Units, Taxes
2. **Master Data**: Products, Variants, Customers, Suppliers, Expense Categories, Inquiry Sources/Statuses
3. **Financial Data**: Financial Years, Ledger Accounts
4. **Security Data**: Users, Roles, User Claims/Logins/Tokens, Role Claims, User Roles
5. **Transaction Data**: Expenses, Inquiries, Purchase Orders, Sales Orders, Stock Transfers, Damaged Stocks
6. **Accounting Data**: Transactions, Transaction Items, Accounting Entries, Tax Entries, Payment Entries, Stock Adjustments
7. **Customer Data**: Customer Ledgers, Loan Details, Loan Repayments
8. **HR Data**: Payrolls, Reminders and related entities

## Error Handling

The utility includes comprehensive error handling:
- Connection failures are caught and displayed with detailed messages
- Data integrity issues are logged with entity and record information
- Stack traces are provided for debugging purposes
- Inner exceptions are displayed when available

## Performance Considerations

- **Batch Processing**: Large datasets are processed in configurable batches to manage memory usage
- **Async Operations**: All database operations are asynchronous for better performance
- **Connection Pooling**: Entity Framework manages connection pooling automatically
- **Index Maintenance**: SQLite indexes are maintained during migration

## Troubleshooting

### Common Issues

1. **Connection String Errors**: Ensure SQL Server is accessible and credentials are correct
2. **SQLite File Permissions**: Ensure write permissions for the SQLite database file location
3. **Memory Issues**: Reduce batch size if encountering memory issues with large datasets
4. **Foreign Key Violations**: Check that entities are migrated in the correct dependency order

### Debug Mode

Set `EnableLogging` to `true` in configuration to see detailed progress information during migration.

## Entity Framework Notes

- The utility uses the same `POSDbContext` class as the main application
- Entity relationships are preserved during migration
- Identity tables (Users, Roles, etc.) are migrated with all related data
- SQLite database is automatically created if it doesn't exist

## Security Considerations

- Connection strings should be secured in production environments
- Consider using environment variables for sensitive connection information
- The utility should be run with appropriate database permissions
- SQLite files should be secured with appropriate file system permissions

## Extending the Utility

To add new entities to the migration:

1. Add the entity to the appropriate migration method
2. Ensure entities are migrated in dependency order
3. Use the `GetSourceQuery` filter for entities that inherit from `BaseEntity`
4. Test the migration with a subset of data first

## License

This utility is part of the POS system and follows the same licensing terms.