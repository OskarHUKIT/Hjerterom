# Privacy & Data Collection Guide for App Stores

## Quick Answer: Should You Share Anonymous User Data?

**Generally: NO** - Unless you're actively using analytics services or sharing data with third parties for advertising/tracking purposes.

---

## What Data Does Your App Collect?

Based on your codebase, here's what your Boligbanken app collects:

### ✅ Data You Collect (Required for App Functionality)

1. **Authentication Data:**
   - Email addresses
   - User IDs (UUIDs)
   - Authentication tokens

2. **User Profile Data:**
   - Full name
   - Email address
   - User role (homeowner, admin, etc.)
   - BankID information (if using BankID login)

3. **Application Data:**
   - Property listings (addresses, prices, descriptions)
   - User agreements (signed terms and conditions)
   - Notifications
   - Audit logs (user actions)

4. **Technical Data (Automatic):**
   - IP addresses (handled by Supabase/Vercel)
   - Device information (handled by Capacitor)
   - Session data

### ❌ Data You DON'T Collect

- **No third-party analytics** (Google Analytics, Firebase Analytics, etc.)
- **No advertising tracking** (no ad networks)
- **No social media tracking**
- **No location tracking** (unless you add it)
- **No biometric data**
- **No payment information** (handled by third parties if applicable)

---

## App Store Privacy Questions: How to Answer

### Apple App Store Connect - App Privacy

When filling out the privacy questionnaire, answer based on what you **actually do**, not what you *could* do:

#### Data Collection Categories:

**1. Contact Information**
- ✅ **YES** - You collect email addresses
- **Purpose:** App Functionality, Account Management
- **Linked to User:** YES
- **Used for Tracking:** NO
- **Shared with Third Parties:** NO (unless you share with specific services)

**2. User Content**
- ✅ **YES** - Property listings, agreements
- **Purpose:** App Functionality
- **Linked to User:** YES
- **Used for Tracking:** NO
- **Shared with Third Parties:** NO

**3. Identifiers**
- ✅ **YES** - User IDs, Device IDs (automatic via Capacitor)
- **Purpose:** App Functionality
- **Linked to User:** YES
- **Used for Tracking:** NO
- **Shared with Third Parties:** NO

**4. Usage Data**
- ❓ **MAYBE** - Depends on Supabase analytics
- If Supabase analytics is enabled: **YES**
- **Purpose:** Analytics (if enabled)
- **Linked to User:** NO (if anonymous)
- **Used for Tracking:** NO
- **Shared with Third Parties:** NO (Supabase is your backend, not a third party)

**5. Diagnostics**
- ❓ **MAYBE** - Error logs, crash reports
- **Purpose:** App Functionality, Analytics
- **Linked to User:** NO (if anonymized)
- **Used for Tracking:** NO
- **Shared with Third Parties:** NO

#### "Do you share anonymous data with third parties?"

**Answer: NO** - Unless you:
- Use Google Analytics
- Use Firebase Analytics
- Share data with advertising networks
- Share aggregated data with analytics services

**Supabase is NOT a third party** - It's your backend infrastructure. Data stored in Supabase is your data, not shared with third parties.

---

### Google Play Console - Data Safety

#### Data Collection & Sharing:

**1. Does your app collect or share any of the required user data types?**
- ✅ **YES** - You collect:
  - Personal info (name, email)
  - Financial info (if handling payments)
  - App activity (user actions)

**2. Is all of the user data collected by your app encrypted in transit?**
- ✅ **YES** - HTTPS/TLS encryption

**3. Do you provide a way for users to request that their data be deleted?**
- ⚠️ **SHOULD BE YES** - You should implement this feature
- Add a "Delete Account" option in your app

**4. Do you share user data with third parties?**
- ❌ **NO** - Unless you explicitly share with:
  - Analytics services
  - Advertising networks
  - Other third-party services

**5. Is the collection of user data disclosed in your app's privacy policy?**
- ✅ **YES** - Must be disclosed in your privacy policy

---

## Privacy Policy Requirements

Both stores **require** a privacy policy URL. Your policy must disclose:

### Required Sections:

1. **What data you collect**
   - Email addresses
   - User profiles
   - Property listings
   - Usage data (if any)

2. **How you use the data**
   - To provide app functionality
   - To manage user accounts
   - To store user agreements

3. **Data storage**
   - Stored in Supabase (your backend)
   - Encrypted in transit
   - Stored securely

4. **Data sharing**
   - Not shared with third parties (unless you do)
   - Supabase is your infrastructure provider

5. **User rights**
   - Right to access data
   - Right to delete data
   - Right to opt-out (if applicable)

6. **Contact information**
   - How to contact you about privacy concerns

---

## Recommendations

### ✅ What You Should Do:

1. **Create a Privacy Policy**
   - Host it on your website or GitHub Pages
   - Make it accessible via URL
   - Include all required sections above

2. **Answer Privacy Questions Honestly**
   - Only say YES to data collection you actually do
   - Don't overstate data collection
   - Don't understate it either

3. **For "Anonymous User Data Sharing":**
   - **Answer NO** unless you're using analytics services
   - Supabase analytics is for your own monitoring, not third-party sharing

4. **Implement Data Deletion**
   - Add a "Delete Account" feature
   - Allow users to request data deletion
   - Respond to deletion requests within required timeframes

### ❌ What You Should NOT Do:

1. **Don't say YES to tracking** unless you're actually tracking users across apps/websites
2. **Don't say YES to third-party sharing** unless you explicitly share data
3. **Don't collect unnecessary data** - Only collect what you need
4. **Don't skip the privacy policy** - Both stores require it

---

## Example Privacy Policy Template

You can use this as a starting point:

```markdown
# Privacy Policy for Boligbanken

Last updated: [Date]

## Information We Collect

We collect the following information:
- Email addresses (for account creation and login)
- User profile information (name, role)
- Property listings and related data
- User agreements and signatures

## How We Use Your Information

We use your information to:
- Provide app functionality
- Manage user accounts
- Store and manage property listings
- Track user agreements

## Data Storage

Your data is stored securely in our database (Supabase) and is encrypted in transit.

## Data Sharing

We do not share your personal information with third parties except:
- As required by law
- To provide app functionality (data stored in our backend)

## Your Rights

You have the right to:
- Access your personal data
- Request deletion of your data
- Opt-out of certain data collection (where applicable)

## Contact Us

For privacy concerns, contact us at: [your-email@example.com]
```

---

## Summary

**Should you share anonymous user data?**

**NO** - Unless you're:
- Using third-party analytics (Google Analytics, etc.)
- Sharing aggregated data with partners
- Using advertising networks

**Your current setup:**
- ✅ Collects user data (required for app functionality)
- ✅ Stores data in Supabase (your backend)
- ❌ Does NOT share with third parties
- ❌ Does NOT use tracking/analytics services

**Answer the app store questions accordingly:**
- Collect data: **YES** (but only what's necessary)
- Share with third parties: **NO**
- Use for tracking: **NO**
- Anonymous data sharing: **NO**

---

## Resources

- [Apple App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
- [Google Play Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- [GDPR Compliance Guide](https://gdpr.eu/) (if applicable)
- [Privacy Policy Generator](https://www.privacypolicygenerator.info/)
