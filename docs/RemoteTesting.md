# Remote App Testing using Expo Go

To test your application remotely on your phone while having it connect to your computer, we will use Expo Go with a Tunnel connection.

## Prerequisites

1.  **Expo Go App**: Install "Expo Go" from the App Store (iOS) or Google Play (Android) on your mobile device.
2.  **Expo Account**: You might need an Expo account to use the tunnel feature smoothly.

## Instructions

1.  **Start the Development Server with Tunnel**:
    Run the following command in your terminal. This creates a public URL for your local server.
    
    ```powershell
    npx expo start --tunnel
    ```

    *Note: If asked to install `@expo/ngrok`, allow it by pressing `y` and Enter.*

2.  **Connect Your Phone**:
    *   **Android**: Open Expo Go and scan the QR code displayed in the terminal.
    *   **iOS**: Open the Camera app, scan the QR code, and tap the notification to open in Expo Go. (Alternatively, log in to Expo Go with the same account as your computer, and the project will appear under "Development Servers".)

3.  **Troubleshooting**:
    *   **"Tunnel not found" or Connection Issues**: Ensure both devices have internet access. If tunnel is unstable, try restarting the command.
    *   **Mock Mode**: Your app is currently set to use Mock Firebase implementation if native modules are not found. This means data changes might not persist between reloads or sync with a real database if the native config is missing or incompatible with Expo Go.

## Verifying Changes
Once the app is running on your phone, navigate through the screens where we made fixes:
- **Budgets**: Check if budget list loads and you can view details.
- **Recurring Series**: Check if you can add/remove series.
- **Chore Templates**: Check if templates load.
- **Task Details**: Open a task and check comments.
- **Profile**: Check if profile loads.
- **Week Plan**: Check if week plan loads.

If you encounter any "Red Screen of Death" (Crash), please share the error message displayed on your phone.
