## README: Smart Tourist Safety System (SIH25002)

## Project Overview

The Smart Tourist Safety System is an innovative solution designed to enhance the safety and security of tourists by leveraging a powerful fusion of AI, Geo-fencing, and Blockchain technology. This project addresses the SIH Problem Statement SIH25002, aiming to provide a comprehensive, real-time monitoring and alert system for tourist safety.

Our current prototype demonstrates the core AI and monitoring capabilities, offering a robust foundation for future integrations.

## Current Prototype Features (Next.js Frontend)

The current prototype provides a complete end-to-end simulation, showcasing the following functionalities:

*   **Live Map Movement for Multiple Tourists:** Visualize the real-time location and movement of multiple simulated tourists on an interactive map.
    
*   **Real-time AI-driven Anomaly Detection with Visual Alerts:** The system actively monitors tourist behavior and environmental factors, identifying anomalies that might indicate a safety risk. Visual alerts are triggered immediately on the dashboard when an anomaly is detected.
    
*   **Fully Functional SOS System (Raise and Resolve):** Tourists can initiate an SOS alert through the simulated mobile app. Authorities can receive, manage, and resolve these alerts, demonstrating a complete emergency response workflow.
    
*   **Dynamic Tourist Safety Score:** Each tourist is assigned a dynamic safety score that adjusts in real-time based on various factors, including their current location (e.g., proximity to high-risk areas) and time of day. This score provides a quick assessment of a tourist's safety status.
    
*   **Detailed, Timestamped Tourist Logs:** Comprehensive logs are maintained for each tourist, recording their movements, activities, and any safety-related events, all with precise timestamps for auditing and analysis.
    
*   **Proactive Safety Alerts (Simulated Mobile App):** Tourists receive proactive safety alerts directly on their simulated mobile app, based on their location, safety score, and detected anomalies.
    
*   **Functional Tourist Density Heatmap (Authorities' Dashboard):** The authorities' dashboard features a heatmap visualizing the density of tourists in different areas, aiding in resource allocation and identifying potential overcrowding or high-risk zones.
    

## Technical Stack (Current Prototype)

*   **Frontend:** Next.js

## Future Enhancements & Integration Plan

Our final development phase will focus on integrating the following key features to complete the system:

*   **Blockchain Integration (Hyperledger Fabric):**
    *   **Secure Tourist Registration:** Integrate with a Hyperledger Fabric backend to provide a decentralized and immutable record for tourist registration, ensuring data integrity and enhanced security.
    *   **Transparent Data Management:** Leverage blockchain for transparent and tamper-proof logging of critical safety events and interactions.
    
*   **Emergency Contact Alerts (Twilio Integration):**
    *   **Automated SMS/WhatsApp Messages:** Integrate a service like Twilio to automatically send SMS or WhatsApp messages to pre-registered emergency contacts when a tourist raises an SOS alert or a critical safety incident is detected.
    
*   **Automated E-FIR Generation:**
    *   **Dashboard Feature:** Develop a feature on the authorities' dashboard that allows for the automated generation of a preliminary Electronic First Information Report (E-FIR) based on collected incident data, streamlining the reporting process.
    

## Getting Started

*(This section will be expanded once the project is ready for deployment and public access.)*

To run the prototype locally, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone [repository_url]
    ```
2.  **Navigate to the app-simulation directory:**
    ```bash
    cd app-simulator
    npm install
    npm run dev -- -p 3001
    ```
    Open [http://localhost:3001/app-simulator](http://localhost:3001/app-simulator) in your browser to view the application.

3.  **Navigate to the live-dashboard directory:**
    ```bash
    cd live-dashboard
    npm install
    npm run dev
    ```
    Open [http://localhost:3000/live-dashboard](http://localhost:3000/live-dashboard) in your browser to view the application.

4.  **Navigate to the backend directory:**
    ```bash
    cd backend
    npm install
    npm run start
    ```

## Contribution

We welcome contributions to this project! If you're interested in helping us develop this system further, please refer to our `CONTRIBUTING.md` (to be created) for guidelines.

## Team

*(Team member names and roles will be listed here.)*

## License

*(License information will be provided here.)*

## Screenshots/Demonstrations

Below are some visual representations of our prototype in action:

**Live Map with Tourist Movement and Alerts:**
