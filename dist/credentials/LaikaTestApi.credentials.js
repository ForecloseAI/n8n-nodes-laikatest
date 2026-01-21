"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LaikaTestApi = void 0;
// Credentials for LaikaTest API authentication
class LaikaTestApi {
    constructor() {
        this.name = 'laikaTestApi';
        this.displayName = 'LaikaTest API';
        this.documentationUrl = 'https://docs.laikatest.com';
        this.properties = [
            {
                displayName: 'API Key',
                name: 'apiKey',
                type: 'string',
                typeOptions: { password: true },
                default: '',
                required: true,
                description: 'Your LaikaTest API key',
            },
            {
                displayName: 'Base URL',
                name: 'baseUrl',
                type: 'string',
                default: 'https://api.laikatest.com',
                description: 'Base URL for the LaikaTest API',
            },
        ];
    }
}
exports.LaikaTestApi = LaikaTestApi;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTGFpa2FUZXN0QXBpLmNyZWRlbnRpYWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NyZWRlbnRpYWxzL0xhaWthVGVzdEFwaS5jcmVkZW50aWFscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSwrQ0FBK0M7QUFDL0MsTUFBYSxZQUFZO0lBQXpCO1FBQ0UsU0FBSSxHQUFHLGNBQWMsQ0FBQztRQUN0QixnQkFBVyxHQUFHLGVBQWUsQ0FBQztRQUM5QixxQkFBZ0IsR0FBRyw0QkFBNEIsQ0FBQztRQUVoRCxlQUFVLEdBQXNCO1lBQzlCO2dCQUNFLFdBQVcsRUFBRSxTQUFTO2dCQUN0QixJQUFJLEVBQUUsUUFBUTtnQkFDZCxJQUFJLEVBQUUsUUFBUTtnQkFDZCxXQUFXLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFO2dCQUMvQixPQUFPLEVBQUUsRUFBRTtnQkFDWCxRQUFRLEVBQUUsSUFBSTtnQkFDZCxXQUFXLEVBQUUsd0JBQXdCO2FBQ3RDO1lBQ0Q7Z0JBQ0UsV0FBVyxFQUFFLFVBQVU7Z0JBQ3ZCLElBQUksRUFBRSxTQUFTO2dCQUNmLElBQUksRUFBRSxRQUFRO2dCQUNkLE9BQU8sRUFBRSwyQkFBMkI7Z0JBQ3BDLFdBQVcsRUFBRSxnQ0FBZ0M7YUFDOUM7U0FDRixDQUFDO0lBQ0osQ0FBQztDQUFBO0FBdkJELG9DQXVCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IElDcmVkZW50aWFsVHlwZSwgSU5vZGVQcm9wZXJ0aWVzIH0gZnJvbSAnbjhuLXdvcmtmbG93JztcblxuLy8gQ3JlZGVudGlhbHMgZm9yIExhaWthVGVzdCBBUEkgYXV0aGVudGljYXRpb25cbmV4cG9ydCBjbGFzcyBMYWlrYVRlc3RBcGkgaW1wbGVtZW50cyBJQ3JlZGVudGlhbFR5cGUge1xuICBuYW1lID0gJ2xhaWthVGVzdEFwaSc7XG4gIGRpc3BsYXlOYW1lID0gJ0xhaWthVGVzdCBBUEknO1xuICBkb2N1bWVudGF0aW9uVXJsID0gJ2h0dHBzOi8vZG9jcy5sYWlrYXRlc3QuY29tJztcblxuICBwcm9wZXJ0aWVzOiBJTm9kZVByb3BlcnRpZXNbXSA9IFtcbiAgICB7XG4gICAgICBkaXNwbGF5TmFtZTogJ0FQSSBLZXknLFxuICAgICAgbmFtZTogJ2FwaUtleScsXG4gICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgIHR5cGVPcHRpb25zOiB7IHBhc3N3b3JkOiB0cnVlIH0sXG4gICAgICBkZWZhdWx0OiAnJyxcbiAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgZGVzY3JpcHRpb246ICdZb3VyIExhaWthVGVzdCBBUEkga2V5JyxcbiAgICB9LFxuICAgIHtcbiAgICAgIGRpc3BsYXlOYW1lOiAnQmFzZSBVUkwnLFxuICAgICAgbmFtZTogJ2Jhc2VVcmwnLFxuICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICBkZWZhdWx0OiAnaHR0cHM6Ly9hcGkubGFpa2F0ZXN0LmNvbScsXG4gICAgICBkZXNjcmlwdGlvbjogJ0Jhc2UgVVJMIGZvciB0aGUgTGFpa2FUZXN0IEFQSScsXG4gICAgfSxcbiAgXTtcbn1cbiJdfQ==