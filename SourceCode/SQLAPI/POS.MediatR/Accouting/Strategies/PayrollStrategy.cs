using POS.Data.Entities;
using POS.Data.Entities.Accounts;
using POS.MediatR;
using POS.Repository;
using POS.Repository.Accouting;
using System;
using System.Threading.Tasks;

public interface IPayrollStrategy
{
    Task ProcessPayrollAsync(Payroll payroll, Guid transactionId);
}

public class PayrollStrategy(
    IAccountingEntryFactory _accountingEntryFactory,
    IAccountingEntryRepository _accountingEntryRepository,
    ILedgerAccountRepository _ledgerAccountRepository) : IPayrollStrategy
{
    public async Task ProcessPayrollAsync(Payroll payroll, Guid transactionId)
    {
        // Ledger accounts
        var salaryExpenseAccount = await _ledgerAccountRepository.GetByAccountCodeAsync("6100");
        var bonusAccount = await _ledgerAccountRepository.GetByAccountCodeAsync("6110");
        var commissionAccount = await _ledgerAccountRepository.GetByAccountCodeAsync("6120");
        var festivalBonusAccount = await _ledgerAccountRepository.GetByAccountCodeAsync("6130");
        var travelAllowanceAccount = await _ledgerAccountRepository.GetByAccountCodeAsync("6140");
        var mobileBillAccount = await _ledgerAccountRepository.GetByAccountCodeAsync("6150");
        var foodBillAccount = await _ledgerAccountRepository.GetByAccountCodeAsync("6160");
        var otherStaffExpenseAccount = await _ledgerAccountRepository.GetByAccountCodeAsync("6190");
        var AdvanceSalaryExpenseAccount = await _ledgerAccountRepository.GetByAccountCodeAsync("6170");
        var salaryPayableAccount = await _ledgerAccountRepository.GetByAccountCodeAsync("2200"); // Liability
        var bankAccount = await _ledgerAccountRepository.GetByAccountCodeAsync("1060"); // Bank
        var cashAccount = await _ledgerAccountRepository.GetByAccountCodeAsync("1050"); // Cash

        if (salaryPayableAccount == null || salaryExpenseAccount == null)
            throw new InvalidOperationException("Required ledger accounts not found");

        // Record Payroll Expenses → Salary Payable
        decimal totalPayroll = 0;

        if (payroll.BasicSalary > 0)
        {
            _accountingEntryRepository.Add(await _accountingEntryFactory.CreateEntryAsync(
                transactionId, payroll.BranchId, salaryExpenseAccount.Id, salaryPayableAccount.Id,
                payroll.BasicSalary, "Salary Expense", payroll.Id.ToString(), payroll.FinancialYearId, EntryType.Salary));
            totalPayroll += payroll.BasicSalary;
        }

        if (payroll.Bonus > 0)
        {
            _accountingEntryRepository.Add(await _accountingEntryFactory.CreateEntryAsync(
                transactionId, payroll.BranchId, bonusAccount.Id, salaryPayableAccount.Id,
                payroll.Bonus, "Bonus Expense", payroll.Id.ToString(), payroll.FinancialYearId, EntryType.Salary));
            totalPayroll += payroll.Bonus;
        }
        if (payroll.Commission > 0)
        {
            _accountingEntryRepository.Add(await _accountingEntryFactory.CreateEntryAsync(
                transactionId, payroll.BranchId, commissionAccount.Id, salaryPayableAccount.Id,
                payroll.Commission, "Commission", payroll.Id.ToString(), payroll.FinancialYearId, EntryType.Salary));
            totalPayroll += payroll.Commission;
        }
        if (payroll.FestivalBonus > 0)
        {
            _accountingEntryRepository.Add(await _accountingEntryFactory.CreateEntryAsync(
                transactionId, payroll.BranchId, festivalBonusAccount.Id, salaryPayableAccount.Id,
                payroll.FestivalBonus, "Festival Allowance", payroll.Id.ToString(), payroll.FinancialYearId, EntryType.Salary));
            totalPayroll += payroll.FestivalBonus;
        }
        if (payroll.TravelAllowance > 0)
        {
            _accountingEntryRepository.Add(await _accountingEntryFactory.CreateEntryAsync(
                transactionId, payroll.BranchId, travelAllowanceAccount.Id, salaryPayableAccount.Id,
                payroll.TravelAllowance, "Travel Allowance", payroll.Id.ToString(), payroll.FinancialYearId, EntryType.Salary));
            totalPayroll += payroll.TravelAllowance;
        }
        if (payroll.MobileBill > 0)
        {
            _accountingEntryRepository.Add(await _accountingEntryFactory.CreateEntryAsync(
                transactionId, payroll.BranchId, mobileBillAccount.Id, salaryPayableAccount.Id,
                payroll.MobileBill, "Mobile Bill Allowance", payroll.Id.ToString(), payroll.FinancialYearId, EntryType.Salary));
            totalPayroll += payroll.MobileBill;
        }
        if (payroll.FoodBill > 0)
        {
            _accountingEntryRepository.Add(await _accountingEntryFactory.CreateEntryAsync(
                transactionId, payroll.BranchId, foodBillAccount.Id, salaryPayableAccount.Id,
                payroll.FoodBill, "Food Bill Allowance", payroll.Id.ToString(), payroll.FinancialYearId, EntryType.Salary));
            totalPayroll += payroll.FoodBill;
        }
        if (payroll.Advance > 0)
        {
            _accountingEntryRepository.Add(await _accountingEntryFactory.CreateEntryAsync(
                transactionId, payroll.BranchId, AdvanceSalaryExpenseAccount.Id, salaryPayableAccount.Id,
                payroll.Advance, "Adavance Salary", payroll.Id.ToString(), payroll.FinancialYearId, EntryType.Salary));
            totalPayroll += payroll.Advance;
        }
        if (payroll.Others > 0)
        {
            _accountingEntryRepository.Add(await _accountingEntryFactory.CreateEntryAsync(
                transactionId, payroll.BranchId, otherStaffExpenseAccount.Id, salaryPayableAccount.Id,
                payroll.Others, "Other Stuff Allowance", payroll.Id.ToString(), payroll.FinancialYearId, EntryType.Salary));
            totalPayroll += payroll.Others;
        }

        // Payment Entry PAID

        var account = payroll.PaymentMode == PaymentMode.BANK ? bankAccount : cashAccount;
        _accountingEntryRepository.Add(await _accountingEntryFactory.CreateEntryAsync(
            transactionId, payroll.BranchId, salaryPayableAccount.Id, account.Id,
            totalPayroll, "Salary Payment", payroll.Id.ToString(), payroll.FinancialYearId, EntryType.Salary));

    }
}
