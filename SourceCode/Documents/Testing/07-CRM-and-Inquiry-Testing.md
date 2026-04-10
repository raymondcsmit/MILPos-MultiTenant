# 07. CRM and Inquiry Test Cases

**Module:** Inquiries, Sources, Statuses, Activities, Follow-ups
**Prerequisites:** Customer data exists. Logged in as Admin or Sales Rep.

---

## Test Case 7.1: Configure CRM Master Data
**Objective:** Verify that Inquiry Sources and Statuses can be defined.

**Steps:**
1. Navigate to CRM/Inquiries -> Sources.
2. Add a new Source: "Website Contact Form".
3. Navigate to CRM/Inquiries -> Statuses.
4. Add a new Status: "New Lead".
5. Add another Status: "Contacted".

**Expected Result:**
- Sources and Statuses are saved successfully and are available in dropdowns when creating an inquiry.

---

## Test Case 7.2: Create a New Inquiry
**Objective:** Verify that a sales lead or customer inquiry can be logged.

**Steps:**
1. Navigate to CRM/Inquiries -> All Inquiries.
2. Click "Add Inquiry".
3. Select/Enter Customer: "Alice Johnson".
4. Select Source: "Website Contact Form".
5. Select Status: "New Lead".
6. Enter Details/Notes: "Customer is interested in purchasing 10 Dell XPS 15 laptops."
7. Assign to a Sales Rep or Manager.
8. Save Inquiry.

**Expected Result:**
- The Inquiry is created successfully with a unique ID.
- The dashboard or task list for the assigned user shows the new inquiry.

---

## Test Case 7.3: Log Inquiry Activity & Follow-up
**Objective:** Verify that interactions regarding an inquiry are tracked.

**Steps:**
1. Open the inquiry created in Test Case 7.2.
2. Navigate to the "Activities" or "Follow-ups" tab.
3. Click "Add Activity".
4. Select Type: "Phone Call".
5. Enter Notes: "Called Alice. She requested a formal quote by tomorrow."
6. Update the Inquiry Status to "Contacted".
7. Save Activity.

**Expected Result:**
- The activity is logged with a timestamp and the user's name.
- The status of the inquiry updates to "Contacted" globally.

---

## Test Case 7.4: Add Attachments to Inquiry
**Objective:** Verify that documents can be uploaded to an inquiry record.

**Steps:**
1. Open the inquiry from Test Case 7.2.
2. Navigate to the "Attachments" tab.
3. Upload a sample PDF or Image (e.g., a drafted quote).
4. Save the attachment.

**Expected Result:**
- The file is uploaded successfully and stored on the server/cloud.
- A download link is available, and clicking it downloads the correct file.
