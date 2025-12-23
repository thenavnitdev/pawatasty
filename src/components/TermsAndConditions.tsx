import { ChevronLeft, X } from 'lucide-react';

interface TermsAndConditionsProps {
  onClose: () => void;
  onNavigateToMap?: () => void;
}

export default function TermsAndConditions({ onClose, onNavigateToMap }: TermsAndConditionsProps) {
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
            <h1 className="text-xl font-bold text-gray-900">Terms & Conditions</h1>
            <button
              onClick={onNavigateToMap || onClose}
              className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-800" />
            </button>
          </div>

          <div className="px-5 py-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">TERMS AND CONDITIONS</h2>
              <p className="text-sm text-gray-600 mb-6">Effective Date: October 21, 2022</p>

              <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
                <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded">
                  <p className="font-bold text-gray-900 mb-2">PLEASE READ THIS AGREEMENT CAREFULLY</p>
                  <p className="text-sm">
                    PawaTasty is a lifestyle platform that seamlessly blends dining, charging, and social discovery through a mobile-first experience designed to keep users powered, connected, and rewarded.
                  </p>
                </div>

                <p>
                  This agreement sets forth the legally binding terms for your use of the services provided by Pawa Technology and its affiliated entities, doing business as Mobile Charging Solutions / Dinning Deals/discounts, Pawa Technology, or any other name used from time to time (referred to as "Pawa Tasty", "Pawa sharing", "Pawa", "We", "Us", or "Our").
                </p>

                <p className="font-semibold text-gray-900">
                  By accessing or using the PawaTasty app or website, you agree to be bound by these terms and conditions. Please read them carefully.
                </p>

                <p>
                  By using our services, you (referred to as "Consumer", "User", "You", or "Your", including your family, heirs, agents, affiliates, representatives, successors, and assigns) agree to all terms and conditions outlined in this agreement. If you do not agree to the conditions stated herein, do not use the services.
                </p>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-900 mb-3">THE SERVICES PROVIDED BY PAWA INCLUDE:</h3>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Pawa mobile application and related website</li>
                    <li>Pawa portable power bank (referred to as "Battery" or "Batteries")</li>
                    <li>Pawa Deals/discounts (e.g., two main courses for the price of one)</li>
                    <li>All related equipment, maintenance, personnel, services, applications, websites, and information provided by Pawa.</li>
                  </ol>
                </div>

                <div className="border-l-4 border-blue-400 pl-4">
                  <h3 className="font-bold text-gray-900 mb-3">Access Based on Plan Type</h3>
                  <p className="mb-3">PawaTasty offers two service tiers, each providing different levels of access and functionality:</p>

                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Pay-Per-Use Plan:</h4>
                      <p>Users with this plan can rent portable power banks at participating locations through the PawaTasty mobile app or platform. This plan does not include access to exclusive deals or promotions.</p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Subscription Plan:</h4>
                      <p>Users with an active subscription can access both charging stations and exclusive partner deals, promotions, and dining discounts featured on the PawaTasty platform.</p>
                    </div>
                  </div>

                  <p className="mt-3 text-blue-700 font-medium">
                    Users may upgrade their account at any time via the mobile app to unlock access to additional features and offers available only to subscribers.
                  </p>
                </div>

                <p>
                  This agreement, including all updates, supplements, additional terms, and Pawa's rules and policies, constitutes the sole agreement for the use of services between you and Pawa. It supersedes all other provisions.
                </p>

                <div className="pt-4">
                  <h3 className="text-base font-bold text-gray-900 mb-4">1. GENERAL BATTERY RENTAL AND USE TERMS</h3>

                  <div className="space-y-5">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">1.1 Consumer Responsibility</h4>
                      <p>
                        Pawa and the Consumer are the only parties involved in this Agreement. The Consumer is the sole renter and must comply with all terms and conditions outlined in this Agreement. The Consumer must use the Battery rented from Pawa solely for their own use. If the Consumer allows someone else to use the Battery, the Consumer is solely responsible for ensuring that the terms and conditions of this Agreement are followed.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">1.2 Battery Ownership</h4>
                      <p>
                        The Battery and all Pawa equipment attached to it remain the exclusive property of Pawa at all times. The Consumer must not dismantle, modify, repair, or damage the Battery or Pawa equipment in any way. Any stickers on the Battery must not be written on, peeled off, or otherwise altered. The Consumer may not use the Battery or Pawa equipment for commercial purposes without Pawa's written permission. The Services offered must only be used for their intended purpose. Tampering with the Services, Battery, or application, or attempting unauthorized access is strictly prohibited.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">1.3 Battery Operating Hours and Availability</h4>
                      <p className="mb-3">
                        The Consumer agrees to rent the Battery within the specified maximum rental time. The number of Batteries available for rent is limited and availability cannot be guaranteed. The Battery is an electric power battery that requires regular charging and must be used safely and responsibly. The Consumer understands the following:
                      </p>
                      <ul className="list-disc pl-5 space-y-2">
                        <li>The remaining charge in the Battery decreases with use and its operational capabilities may decrease or stop completely as the charge decreases.</li>
                        <li>The level of charge in the Battery when the rental starts is not guaranteed and may vary with each rental.</li>
                        <li>The rate at which the charge decreases during use is not guaranteed and depends on the Battery, operational conditions, weather, and other factors.</li>
                        <li>The Consumer is responsible for checking the Battery's charge level before use and ensuring it is adequate.</li>
                        <li>The amount of time the Battery will function before losing its charge is not guaranteed.</li>
                        <li>The Battery may lose charge and stop functioning at any time during the rental, including before the Consumer intends to recharge it.</li>
                      </ul>
                      <p className="mt-3">
                        If the Battery stops functioning during a rental due to a lack of charge, the Consumer must return it in accordance with this Agreement. Pawa is not liable for any accidents that occur as a result of the Battery running out of charge.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">1.4 Reporting Accidents or Damage</h4>
                      <p>
                        The Consumer must report any accidents, damage, personal injury, or lost or stolen Battery to Pawa as soon as possible by emailing hello@pawatasty.com. If there is a personal injury, property damage, or stolen Battery, the Consumer must report the incident to Pawa within 24 hours.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">1.5 Liability</h4>
                      <p>
                        The Consumer is solely responsible for the Battery during the rental period and is liable for any misuse, claims, losses, damages, injuries, costs, penalties, or expenses that occur while the Battery is in their custody. The Consumer must return the Battery in the same condition as when rented and will not be held responsible for normal wear and tear. The Consumer must pay any fines, fees, penalties, court costs, or other charges incurred by Pawa due to improper use of the Battery or violation of laws, regulations, or ordinances while using the Services. The Consumer is solely responsible for any harmful consequences, financial or otherwise, from attempting to recharge the Battery using any means other than Pawa's charging station, and Pawa will not be held liable.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <h3 className="text-base font-bold text-gray-900 mb-4">2. PAYMENT AND FEES</h3>

                  <div className="space-y-5">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">2.1 Utilization Fees</h4>
                      <p>
                        The user may use the Battery on a pay-per-use basis, where "use" refers to unlocking the Battery through the Pawa mobile application and utilizing it until it is returned to a Pawa battery storage pack. Alternatively, fees and charges may be determined according to the pricing described on the Pawa app or website for the station being used. Pawa may charge and collect taxes and local government fees in addition to the fees. Pawa will charge the user through credit/debit card or other payment methods offered during subscription for the fees as described.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">2.2 Promo Codes</h4>
                      <p>
                        Promo codes (discounts) can only be redeemed through the Pawa application. Pawa reserves the right to modify or cancel discounts at any time and they are non-transferable and cannot be resold.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">2.3 Rental Time and Charges</h4>
                      <p>
                        Information about rental time and charges can be found on the Pawa website (https://pawatasty.com/pricing) or in the Pawa iOS and Android apps before rental. The user is solely responsible for ensuring that the Battery is locked within the rental time. If the Battery is not returned within the rental period, it will be considered sold to the user for €50.00, but this sale will be cancelled if the Battery is returned to any Pawa charging bank.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">2.4 Valid Payment Method</h4>
                      <p>
                        To register for the services, the user must provide Pawa with a valid payment method accepted by the company. The user represents that they are authorized to use the payment method and authorizes Pawa to charge the fees, including taxes and local government fees, to the method. If the user disputes a charge, they must inform Pawa within 10 business days of the end of the month and provide information about the dispute, such as the utilization date and times. The user must immediately inform Pawa of any changes to the payment method.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">2.5 Payment Scheme</h4>
                      <p>
                        Details of the payment scheme for the services can be found on the Pawa website (https://pawatasty.com/pricing) and in the Pawa apps. Pawa reserves the right to change prices at any time. At the start of the rental period, a deposit will be authorized on the user's payment method for an amount determined by Pawa. The rental fee will be taken from the deposit and the difference returned to the user at the end of the rental period.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <h3 className="text-base font-bold text-gray-900 mb-4">3. ADDITIONAL TERMS OF USE</h3>

                  <div className="space-y-5">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">3.1 Safety Check</h4>
                      <ul className="list-disc pl-5 space-y-2">
                        <li>If a user discovers any defect or potential safety issue with a battery, they must stop using it immediately and report it to Pawa.</li>
                        <li>The user must report any defects or safety issues to Pawa promptly.</li>
                        <li>If the user fails to comply with these requirements, they will be fully liable for any consequences, including all claims, losses, damages, and expenses, and must indemnify Pawa.</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">3.2 Lost or Stolen Battery</h4>
                      <p>
                        A battery may be considered lost or stolen if, in Pawa's reasonable determination, the circumstances suggest so. The last user of the battery will be responsible unless the circumstances suggest otherwise. Pawa has the right to take any necessary action, including seeking restitution and compensation, and filing a police report. The user must report the disappearance or theft of the battery to Pawa immediately. Pawa's computer data will be considered conclusive evidence of the battery's usage.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">3.3 Limitations on Services Availability</h4>
                      <p>
                        Pawa strives to provide the services 365 days a year, but cannot guarantee availability at all times due to unforeseen events. Access to services is dependent on battery availability, which may not be guaranteed even if it is marked as available on the mobile app.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">3.4 Access License</h4>
                      <p>
                        Subject to the user's compliance with this agreement, Pawa grants the user a limited, revocable license to access and use the services and its content. The license does not include any commercial or resale use, collection of product listings or prices, or unauthorized use of data mining tools. Any unauthorized use will automatically terminate the license granted.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">3.5 Copyright and Ownership</h4>
                      <p>
                        The content on the services, including text, graphics, photographs, images, sound, and illustrations, is owned by Pawa, its licensors, agents, and content providers. The design and content of the services are protected by intellectual property laws. The services may only be used for their intended purpose and may not be modified, copied, sold, or exploited without Pawa's written consent. The user is responsible for obtaining permission for any reused copyrighted material. The services, its content, and related rights remain the exclusive property of Pawa unless otherwise agreed. No proprietary notices may be removed from the materials on the services.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">3.6 Trademarks/No Endorsement</h4>
                      <p>
                        All trademarks, service marks, and trade names used by Pawa, including its name, logo, and the services name, are trademarks of Mobile Charging Solutions or its affiliates, partners, vendors, or licensors. The user may not use Pawa's trademarks without prior written consent and should not use any language or symbols that suggest endorsement by Pawa. The use of Pawa's marks does not grant the user any rights or license to use Pawa's proprietary materials.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <h3 className="text-base font-bold text-gray-900 mb-4">4. TERMINATION</h3>
                  <p className="mb-3">
                    You have the right to end this Agreement at any time by giving notice to Pawa. To do so, send an email to hello@pawatasty.com. If you terminate the Agreement, (i) all rights granted to you will end immediately; (ii) you must stop using the Services and/or Batteries; and (iii) you must pay Pawa all outstanding amounts. Upon termination, you will lose access to all Services.
                  </p>
                  <p>
                    Pawa also has the right to terminate this Agreement and/or suspend your access to its Services with written notice (including email) if: (a) you fail to pay Pawa any amount owed under this Agreement or (b) you violate any terms or conditions of this Agreement. Upon termination of this Agreement for any reason, your access to and use of the Services will end.
                  </p>
                </div>

                <div className="pt-4">
                  <h3 className="text-base font-bold text-gray-900 mb-4">5. CONFIDENTIALITY</h3>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">5.1 Confidentiality and Privacy Policies</h4>
                    <p>
                      You understand and agree that Pawa will keep all personal information it holds about users, including names, addresses, phone numbers, email addresses, passwords, payment information, and other information, in accordance with its privacy policy (found on https://pawatasty.com). However, (i) if you are unable to provide personal information to authorities, Pawa may, at its sole discretion, provide your name, address, phone number, and other information to such authorities; (ii) if Pawa receives a subpoena, it will provide the requested information as required by law; (iii) Pawa may disclose aggregate and other data about you as permitted by law, including general latitude and longitude data for your addresses (as long as this does not allow an individual's address to be identified).
                    </p>
                    <p className="mt-3">
                      Pawa may also disclose individual data to a third party with your express permission and consent (e.g. for participation in a study).
                    </p>
                  </div>
                </div>

                <div className="pt-4">
                  <h3 className="text-base font-bold text-gray-900 mb-4">6. COMMUNICATIONS AND AGREEMENT TO BE CONTACTED</h3>

                  <div className="space-y-4">
                    <p>
                      <span className="font-semibold">6.1.</span> You confirm that any contact information provided to Pawa, such as your name, email address, and mobile phone number, is accurate. You also confirm that you are the current subscriber or owner of any phone number provided to Pawa. If your contact information changes, including your phone number, you agree to update it using the Pawa app or website. If you have issues, contact hello@pawatasty.com. You agree to compensate, defend, and hold Pawa harmless from and against any claims, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising from your failure to update your contact information, providing a phone number that is not yours, or violating any federal, state, or local law, regulation, or ordinance.
                    </p>

                    <p>
                      <span className="font-semibold">6.2.</span> By voluntarily providing your phone number(s) to Pawa, you agree to receive text messages related to your registration. Consent to receive automated marketing calls/texts is not a requirement for rental or purchase. You acknowledge that your phone carrier may charge for calls or text messages and that Pawa is not responsible for these charges.
                    </p>

                    <p>
                      <span className="font-semibold">6.3.</span> You agree that Pawa may contact you at the email addresses you provide or obtain from other sources. You agree to receive emails even if you cancel your account or end your relationship with Pawa, unless you opt out. To opt out, email hello@pawatasty.com with the subject "Opt out." It may take up to 30 days to process your opt-out request. You may also use other opt-out methods offered by Pawa on its app or website (if any). It is your responsibility to notify Pawa if you do not want to receive emails by following the opt-out procedures.
                    </p>
                  </div>
                </div>

                <div className="bg-gray-100 p-4 rounded-lg mt-6">
                  <p className="text-xs text-gray-600 text-center">
                    Last Updated: October 21, 2022
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
