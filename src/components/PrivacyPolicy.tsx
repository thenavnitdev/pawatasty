import { ChevronLeft, X } from 'lucide-react';

interface PrivacyPolicyProps {
  onClose: () => void;
  onNavigateToMap?: () => void;
}

export default function PrivacyPolicy({ onClose, onNavigateToMap }: PrivacyPolicyProps) {
  return (
    <div className="fixed inset-0 bg-white z-50 overflow-hidden">
      <div className="h-full overflow-y-auto">
        <div className="min-h-full w-full max-w-md mx-auto bg-white">
          <div className="sticky top-0 bg-white z-10 px-4 py-4 flex items-center justify-between border-b border-gray-200">
            <button
              onClick={onClose}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-800" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Privacy Policy</h1>
            <button
              onClick={onNavigateToMap || onClose}
              className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-800" />
            </button>
          </div>

          <div className="px-5 py-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">PRIVACY POLICY</h2>
              <p className="text-sm text-gray-600 mb-6">Last Updated: May 10, 2022</p>

              <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                  <p className="font-semibold text-gray-900 mb-2">Data Collection Notice</p>
                  <p>
                    This Application collects Personal Data from its Users. The policy can be printed through the print command in the browser settings.
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-2">Owner and Data Controller</h3>
                  <p className="mb-1">Wilhelmina van Pruisenweg 35, 2595 AN The Hague</p>
                  <p>Contact: <a href="mailto:hello@pawatasty.com" className="text-blue-600 hover:underline">hello@pawatasty.com</a></p>
                </div>

                <div className="pt-4">
                  <h3 className="text-base font-bold text-gray-900 mb-4">TYPES OF DATA COLLECTED</h3>
                  <p className="mb-3">
                    This Application collects various types of Personal Data, either directly or through third parties. These include:
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <ul className="list-disc pl-5 space-y-1 text-xs">
                      <li>Tracker and unique device identifiers for advertising (e.g. Google Advertiser ID or IDFA)</li>
                      <li>Device information, geography/region</li>
                      <li>Number of Users and sessions, session duration</li>
                      <li>Application opens/launches, operating systems</li>
                      <li>Email address, usage data, universally unique identifier (UUID)</li>
                      <li>Payment info, first and last name, billing address</li>
                      <li>Phone number, password, social media accounts</li>
                      <li>Geographic position, location permissions (continuous/non-continuous and approximate/precise)</li>
                      <li>Camera permission (without saving or recording)</li>
                      <li>Shipping address</li>
                    </ul>
                  </div>
                  <p className="mt-3 text-xs text-gray-600">
                    The details of each type of data collected are provided in the dedicated sections of this privacy policy or in specific explanation texts displayed before the data is collected.
                  </p>
                </div>

                <div className="pt-4">
                  <h3 className="text-base font-bold text-gray-900 mb-4">DATA COLLECTION</h3>
                  <p className="mb-3">
                    Personal Data can either be provided by the User or collected automatically when using the Application (e.g. Usage Data). Unless specified otherwise, all Data requested by the Application is mandatory and failure to provide it may result in the inability to use its services.
                  </p>
                  <p className="mb-3">
                    If some Data is not mandatory, the User can choose not to provide it without affecting the availability or functionality of the service. If unsure about mandatory data, the User can contact the Owner.
                  </p>
                  <p>
                    The use of Cookies or other tracking tools by the Application or third-party services used by the Application serves the purpose of providing the required Service and any other purposes outlined in this privacy policy and the Cookie Policy (if available). The User is responsible for obtaining consent from third parties for any Personal Data obtained, published, or shared through the Application.
                  </p>
                </div>

                <div className="pt-4">
                  <h3 className="text-base font-bold text-gray-900 mb-4">DATA PROCESSING</h3>
                  <p className="mb-3">
                    The Owner implements appropriate security measures to prevent unauthorized access, modification, disclosure, or destruction of the Data. The processing of Data is carried out using computers and/or IT tools and following organizational procedures strictly related to the intended purposes.
                  </p>
                  <p className="mb-3">
                    The Data may be accessible to certain personnel involved in the operation of the Application (e.g. administration, sales, marketing, legal, system administration) or external parties (e.g. technical service providers, mail carriers, hosting providers, IT companies, communications agencies) appointed as Data Processors by the Owner if necessary.
                  </p>
                  <p className="text-gray-600">
                    The updated list of these parties can be requested from the Owner at any time.
                  </p>
                </div>

                <div className="pt-4">
                  <h3 className="text-base font-bold text-gray-900 mb-4">LEGAL BASIS OF PROCESSING</h3>
                  <p className="mb-3">The Owner can process Personal Data if one of the following applies:</p>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>User consent for specific purposes</li>
                    <li>Provision of Data is necessary for performance of an agreement with the User</li>
                    <li>Necessary for compliance with a legal obligation</li>
                    <li>Related to a task carried out in the public interest or exercise of official authority</li>
                    <li>Necessary for the Owner's or a third party's legitimate interests</li>
                  </ol>
                  <p className="mt-3">The Owner will clarify the specific legal basis for processing upon request.</p>
                </div>

                <div className="pt-4">
                  <h3 className="text-base font-bold text-gray-900 mb-4">PLACE OF PROCESSING</h3>
                  <p className="mb-3">
                    The Data is processed at the Owner's operating offices and any other places where the parties involved in the processing are located. Data transfers to a country other than the User's may occur, and details on the place of processing can be found in the relevant section of this privacy policy.
                  </p>
                  <p>
                    The User has the right to know about the legal basis of data transfers and the security measures taken by the Owner to safeguard their Data. If such a transfer occurs, more information can be obtained by checking the relevant sections of this document or contacting the Owner.
                  </p>
                </div>

                <div className="pt-4">
                  <h3 className="text-base font-bold text-gray-900 mb-4">RETENTION TIME</h3>
                  <p className="mb-3">
                    Personal Data will be processed and stored for as long as required by the purpose they have been collected for.
                  </p>
                  <div className="space-y-3">
                    <p>
                      <span className="font-semibold">Personal Data collected for contract performance</span> will be kept until the contract is fulfilled.
                    </p>
                    <p>
                      <span className="font-semibold">Personal Data collected for legitimate interests</span> will be kept as long as needed to achieve those interests. Information on the legitimate interests can be found in this document or by contacting the owner.
                    </p>
                    <p>
                      If the user gives consent, the owner may keep Personal Data for a longer period, but only as long as the consent is not withdrawn. Additionally, if required by law or by an authority, the owner may be obliged to keep Personal Data longer.
                    </p>
                    <p className="text-gray-600">
                      After the retention period, Personal Data will be deleted and the rights of access, erasure, rectification, and data portability cannot be exercised.
                    </p>
                  </div>
                </div>

                <div className="pt-4">
                  <h3 className="text-base font-bold text-gray-900 mb-4">PROCESSING PURPOSES</h3>
                  <p className="mb-3">The owner collects User Data to provide its service, meet legal obligations, respond to enforcement requests, protect rights and interests, detect malicious or fraudulent activity, and for:</p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>• Analytics</div>
                      <div>• User database management</div>
                      <div>• Handling payments</div>
                      <div>• Registration and authentication</div>
                      <div>• A/B testing</div>
                      <div>• Social features</div>
                      <div>• Managing contacts</div>
                      <div>• Infrastructure monitoring</div>
                      <div>• Location-based interactions</div>
                      <div>• Device permissions</div>
                      <div>• Hosting and backend</div>
                      <div>• Platform services</div>
                      <div>• Managing support requests</div>
                      <div>• Location processing</div>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-gray-600">
                    For information on the Personal Data used for each purpose, see "Detailed information on the processing of Personal Data".
                  </p>
                </div>

                <div className="pt-4">
                  <h3 className="text-base font-bold text-gray-900 mb-4">DEVICE PERMISSIONS FOR PERSONAL DATA ACCESS</h3>
                  <p className="mb-3">
                    Depending on the device, this application may ask for certain permissions to access device data. The user must grant these permissions, but can revoke them at any time through device settings or by contacting the owner.
                  </p>
                  <p className="mb-3 text-orange-700 font-medium">
                    Revoking these permissions may impact the application's functioning.
                  </p>

                  <div className="space-y-4 mt-4">
                    <div className="border-l-4 border-green-400 pl-3">
                      <h4 className="font-semibold text-gray-900 mb-2">Location Permissions</h4>
                      <ul className="space-y-2 text-xs">
                        <li><span className="font-medium">Approximate location (continuous):</span> Used to access the user's approximate device location and provide location-based services.</li>
                        <li><span className="font-medium">Approximate location (non-continuous):</span> Used to access the user's approximate device location and provide location-based services, but the location is not determined continuously.</li>
                        <li><span className="font-medium">Precise location (continuous):</span> Used to access the user's precise device location and provide location-based services.</li>
                        <li><span className="font-medium">Precise location (non-continuous):</span> Used to access the user's precise device location and provide location-based services, but the location is not determined continuously.</li>
                      </ul>
                    </div>

                    <div className="border-l-4 border-purple-400 pl-3">
                      <h4 className="font-semibold text-gray-900 mb-2">Camera Permission</h4>
                      <p className="text-xs">
                        <span className="font-medium">Camera permission (without saving or recording):</span> Used to access the camera or capture images and video from the device, but does not save or record the output.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <h3 className="text-base font-bold text-gray-900 mb-4">DETAILED INFORMATION ON PERSONAL DATA PROCESSING</h3>
                  <p className="mb-4 text-gray-600">Personal Data is collected for the following purposes and using the following services:</p>

                  <div className="space-y-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Analytics</h4>
                      <p className="text-xs mb-2">Services that allow the owner to monitor and analyze web traffic and track user behavior.</p>
                      <div className="text-xs text-gray-600">
                        <p className="font-medium text-gray-800 mt-2">Google Analytics for Firebase (Google LLC)</p>
                        <p className="mt-1">Personal data: application opens, device information, geography/region, launches, number of sessions, number of users, operating systems, session duration, tracker, and unique device identifiers.</p>
                        <p className="mt-1">Place of processing: United States</p>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Handling Payments</h4>
                      <p className="text-xs mb-2">Payment processing through external service providers.</p>
                      <div className="space-y-3 text-xs text-gray-600">
                        <div>
                          <p className="font-medium text-gray-800">Stripe (Stripe Technology Europe Ltd)</p>
                          <p>Personal data: billing address, email, first and last name, payment information</p>
                          <p>Place of processing: Ireland</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">PayPal (PayPal Inc.)</p>
                          <p>Personal data: billing address, email, first and last name, phone number</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">Apple Pay (Apple Inc.)</p>
                          <p>Personal data: billing address, email, first and last name, payment information, shipping address</p>
                          <p>Place of processing: United States</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">Google Pay (Google Ireland Limited)</p>
                          <p>Personal data: billing address, email, first and last name, payment information, shipping address</p>
                          <p>Place of processing: Ireland</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Location Processing</h4>
                      <div className="text-xs text-gray-600">
                        <p className="font-medium text-gray-800">Radar (Radar Labs, Inc.)</p>
                        <p className="mt-1">A geolocation service that collects location data (latitude, longitude), device IDs, IP addresses, and device info.</p>
                        <p className="mt-1">Place of processing: United States</p>
                        <a href="https://radar.com/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Registration and Authentication</h4>
                      <div className="space-y-3 text-xs text-gray-600">
                        <div>
                          <p className="font-medium text-gray-800">Firebase Authentication (Google LLC)</p>
                          <p>Personal data: email, name, password, phone number, social media accounts</p>
                          <p>Place of processing: United States</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">Facebook Authentication (Meta Platforms Ireland Limited)</p>
                          <p>Place of processing: Ireland</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Infrastructure Monitoring</h4>
                      <div className="space-y-3 text-xs text-gray-600">
                        <div>
                          <p className="font-medium text-gray-800">Firebase Performance Monitoring (Google LLC)</p>
                          <p>Place of processing: United States</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">Sentry (Functional Software, Inc.)</p>
                          <p>Place of processing: United States</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Platform Services and Hosting</h4>
                      <div className="space-y-3 text-xs text-gray-600">
                        <div>
                          <p className="font-medium text-gray-800">Apple App Store (Apple Inc.)</p>
                          <p>Place of processing: United States</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">Google Play Store (Google Ireland Limited)</p>
                          <p>Place of processing: Ireland</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <h3 className="text-base font-bold text-gray-900 mb-4">USERS' RIGHTS</h3>
                  <p className="mb-3">Users have the right to:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Withdraw consent at any time</li>
                    <li>Object to processing of their data</li>
                    <li>Access their data</li>
                    <li>Verify and rectify their data</li>
                    <li>Restrict processing</li>
                    <li>Delete their data</li>
                    <li>Receive their data and transfer it to another controller</li>
                    <li>File a complaint with authorities</li>
                  </ul>
                  <p className="mt-4 font-semibold">Exercising User Rights</p>
                  <p className="mt-2">
                    User rights can be exercised by contacting the Owner using the contact information provided in this document. These requests are free and will be addressed by the Owner within one month or as soon as possible.
                  </p>
                </div>

                <div className="pt-4">
                  <h3 className="text-base font-bold text-gray-900 mb-4">ADDITIONAL INFORMATION</h3>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Legal Action</h4>
                      <p>
                        The Owner may use the User's Personal Data for legal purposes in court or in preparation for potential legal action resulting from improper use of the Application or Services. The User acknowledges that the Owner may be required to disclose personal data to public authorities upon request.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">System Logs and Maintenance</h4>
                      <p>
                        For operation and maintenance, this Application and third-party services may collect interaction records (System logs) and use other Personal Data (such as IP Address).
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Handling "Do Not Track" Requests</h4>
                      <p>
                        This Application does not support "Do Not Track" requests. To determine if third-party services used by this Application honor these requests, consult their privacy policies.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Changes to Privacy Policy</h4>
                      <p>
                        The Owner reserves the right to change this privacy policy at any time by posting updates on this page and potentially within the Application. It is recommended to check this page frequently, with the last modification date listed at the bottom.
                      </p>
                      <p className="mt-2 text-orange-700">
                        If changes impact processing activities based on the User's consent, the Owner will obtain new consent as needed.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Push Notifications</h4>
                      <p>
                        This app may send push notifications to the user. Users may opt-out by changing the notification settings for this app on their device, but this may negatively affect the app's functionality. Push notifications may also be sent based on the user's location.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-base font-bold text-gray-900 mb-4">DEFINITIONS AND LEGAL REFERENCES</h3>

                  <div className="space-y-3 text-xs">
                    <div>
                      <p className="font-semibold text-gray-900">Personal Data</p>
                      <p className="text-gray-600">Data that directly, indirectly, or in connection with other information allows for the identification of a natural person.</p>
                    </div>

                    <div>
                      <p className="font-semibold text-gray-900">Usage Data</p>
                      <p className="text-gray-600">Information automatically collected through the Application or third-party services used by it.</p>
                    </div>

                    <div>
                      <p className="font-semibold text-gray-900">User</p>
                      <p className="text-gray-600">The person using the Application, who is the Data Subject unless otherwise specified.</p>
                    </div>

                    <div>
                      <p className="font-semibold text-gray-900">Data Subject</p>
                      <p className="text-gray-600">The natural person to whom Personal Data refers.</p>
                    </div>

                    <div>
                      <p className="font-semibold text-gray-900">Data Processor</p>
                      <p className="text-gray-600">The natural or legal person, public authority, agency, or other body that processes Personal Data on behalf of the Controller.</p>
                    </div>

                    <div>
                      <p className="font-semibold text-gray-900">Data Controller (Owner)</p>
                      <p className="text-gray-600">The natural or legal person, public authority, agency, or other body that determines the purposes and means of processing Personal Data.</p>
                    </div>

                    <div>
                      <p className="font-semibold text-gray-900">Application</p>
                      <p className="text-gray-600">The means by which Personal Data of the User is collected and processed.</p>
                    </div>

                    <div>
                      <p className="font-semibold text-gray-900">Service</p>
                      <p className="text-gray-600">The service provided by the Application as described in its terms and on the site/application.</p>
                    </div>

                    <div>
                      <p className="font-semibold text-gray-900">Cookie</p>
                      <p className="text-gray-600">Small data files stored in the User's browser, used as trackers.</p>
                    </div>

                    <div>
                      <p className="font-semibold text-gray-900">Tracker</p>
                      <p className="text-gray-600">Any technology (such as cookies, unique identifiers, web beacons, embedded scripts, e-tags, or fingerprinting) used to track Users.</p>
                    </div>

                    <div>
                      <p className="font-semibold text-gray-900">European Union (EU)</p>
                      <p className="text-gray-600">References to the European Union in this document include all current member states of the European Union and the European Economic Area unless otherwise specified.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-100 p-4 rounded-lg mt-6">
                  <p className="text-xs text-gray-600 mb-2">
                    <span className="font-semibold">Legal Information:</span> This privacy statement is based on provisions from various legislations, including Art. 13/14 of the General Data Protection Regulation (EU) 2016/679.
                  </p>
                  <p className="text-xs text-gray-600 mb-3">
                    This privacy policy applies solely to this Application unless stated otherwise within this document.
                  </p>
                  <p className="text-xs text-gray-600 text-center font-semibold">
                    Last Updated: May 10, 2022
                  </p>
                  <p className="text-xs text-gray-600 text-center mt-2">
                    For questions or concerns, please contact us at hello@pawatasty.com
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
