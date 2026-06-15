# PrintSlot User Research Survey

## Purpose

This survey validates the highest-risk product assumptions in the current PrintSlot docs: whether customers value queue removal, scheduled pickup, upfront pricing, digital print configuration, live status, wallet/cash payment, Bengali support, and whether shop staff or owners can realistically run orders from a phone dashboard.

Use this as a Google Forms-ready survey. It is intentionally short: 14 total questions, with branching so most respondents answer fewer.

## Target respondents

- University students and local community members who print documents.
- Print shop staff, managers, and owners near campus or local communities.
- Optional: university/admin stakeholders who understand campus print operations.

## Form intro

PrintSlot is a proposed mobile app for campus and local print shops. Customers would upload files, choose print settings, see price before confirming, and either join a live queue or schedule pickup. Shops would manage jobs, slots, staff, and order status from the app.

This survey takes about 5 minutes. Your answers will be used only to improve the product concept.

## Survey Questions

### Section 1: About You

**Q1. Which best describes you?**
Type: single choice
Required: yes
Skip logic:
- If "Customer / student / local resident", go to Section 2A.
- If "Print shop staff", "Print shop owner / manager", or "University / admin stakeholder", go to Section 2B.
- If "Other", continue to Section 2A unless their explanation clearly fits shop operations.

Options:
- Customer / student / local resident
- Print shop staff
- Print shop owner / manager
- University / admin stakeholder
- Other: short answer

**Q2. How often do you personally print documents?**
Type: single choice
Required: yes
Ask: everyone

Options:
- Daily or almost daily
- A few times per week
- A few times per month
- Rarely
- I do not print documents myself

**Q3. In the last 30 days, which print-shop problems have you seen or experienced?**
Type: multiple choice
Required: yes
Ask: everyone
Instruction: Select all that apply.

Options:
- Long physical queue or waiting time
- Price was unclear before printing
- Wrong print settings, such as color, copies, page size, or duplex
- File or page-count confusion
- Shop said the order was not ready when expected
- Hard to communicate order details to staff
- Payment or change/cash problem
- No easy way to track order status
- I have not seen any major problem
- Other: short answer

**Q4. If PrintSlot existed, which 3 benefits would matter most to you?**
Type: multiple choice with max 3 selections
Required: yes
Ask: everyone

Options:
- Place orders without standing in line
- See exact price before confirming
- Avoid wrong print settings
- Get live order status and ready notification
- Schedule a pickup time
- Pay by wallet or cash at pickup
- Use the app in Bangla
- Keep a digital order history or receipt
- Help shops process jobs faster

### Section 2A: Customer Experience

Show this section if Q1 is "Customer / student / local resident" or "Other".

**Q5. Which print-order method would you most likely use?**
Type: single choice
Required: yes

Options:
- Print Now: join the current queue and get an ETA
- Schedule Pickup: choose a pickup time slot
- I would use both depending on urgency
- I would still prefer walking in and explaining at the counter
- Not sure

**Q6. How confident would you feel uploading files and setting print options in an app?**
Type: linear scale, 1 to 5
Required: yes
Scale labels:
- 1 = Not confident
- 5 = Very confident

**Q7. Which payment option would you prefer for campus printing?**
Type: single choice
Required: yes

Options:
- Cash at pickup
- In-app wallet balance credited by shop/admin
- Mobile banking or card, if added later
- Either cash or wallet is fine
- I would not be comfortable paying through the app

**Q8. Which updates would you want after placing an order?**
Type: multiple choice
Required: yes
Instruction: Select all that apply.

Options:
- Order accepted by shop
- Queue position
- Estimated ready time
- Printing started
- Ready for pickup
- Order cancelled or changed
- Low wallet balance
- I do not need updates

**Q9. What would be your biggest concern about using PrintSlot?**
Type: single choice
Required: yes

Options:
- File privacy or document security
- Wrong price or unexpected extra charge
- Order not ready at the promised time
- App or internet not working at the shop
- Wallet refund or balance issue
- Too many steps compared with walking in
- Shop staff may ignore app orders
- No major concern
- Other: short answer

### Section 2B: Shop Operations

Show this section if Q1 is "Print shop staff", "Print shop owner / manager", or "University / admin stakeholder".

**Q10. About how many print orders does the shop handle on a normal working day?**
Type: single choice
Required: yes

Options:
- Fewer than 20
- 20 to 49
- 50 to 99
- 100 to 199
- 200 or more
- Not sure

**Q11. What are the hardest parts of managing print jobs today?**
Type: multiple choice
Required: yes
Instruction: Select all that apply.

Options:
- Tracking whose job is next
- Understanding customer print settings
- Estimating when orders will be ready
- Managing peak-hour queues
- Handling cash, change, or unpaid orders
- Updating customers when jobs are ready
- Managing staff assignments
- Keeping records of revenue or completed jobs
- None of these
- Other: short answer

**Q12. Which shop controls would be necessary before accepting app orders?**
Type: multiple choice
Required: yes
Instruction: Select all that apply.

Options:
- Set prices for color, black-and-white, paper size, duplex, and copies
- Open or close queue availability
- Set time slots and maximum orders per slot
- Pause new orders during machine problems or overload
- Assign staff users
- View customer file and exact print settings
- Mark order status: queued, processing, ready, collected
- See daily revenue and order counts
- Reject or clarify unclear orders
- Other: short answer

### Section 3: Final Checks

**Q13. Which language would you prefer for the app interface?**
Type: single choice
Required: yes
Ask: everyone

Options:
- English
- Bangla
- Both English and Bangla, with a switch
- No preference

**Q14. What is one thing PrintSlot must do well for you to trust or use it?**
Type: paragraph
Required: no
Ask: everyone

Placeholder: Example: accurate price, fast pickup, privacy, easy settings, reliable notifications, shop staff adoption.

## Analysis Plan

| Decision or risk | Survey evidence |
|---|---|
| Whether the main customer value is queue removal, price trust, configuration accuracy, or tracking | Q3, Q4, Q5, Q8, Q14 |
| Whether "Print Now" and "Schedule Pickup" both deserve P0 treatment | Q5, segmented by Q2 |
| Whether wallet should be emphasized in v1 or cash should remain prominent | Q7, Q9 |
| Whether customers can handle digital upload and print configuration | Q6, Q9, Q14 |
| Which notifications are actually valuable | Q8 |
| Whether Bangla support is important for adoption | Q13, segmented by role |
| Shop operational readiness and needed owner controls | Q10, Q11, Q12 |
| Trust blockers before launch | Q9, Q14 |

## Recommended Segments

Analyze results by:

- Role from Q1.
- Print frequency from Q2.
- Customer pickup preference from Q5.
- Shop order volume from Q10.
- Preferred language from Q13.

## Launch Notes

- Pilot with 5 to 8 people first: at least 3 customers and 2 shop operators if possible.
- After the pilot, check whether any option is unclear, whether people finish within 5 minutes, and whether "Other" responses reveal missing choices.
- For broader collection, aim for at least 40 customer responses and 5 to 10 shop-operator responses. Treat shop responses qualitatively if the sample is small.
- Keep Q14 optional so respondents can finish quickly, but review it first during analysis because it will surface trust issues not captured by fixed choices.
