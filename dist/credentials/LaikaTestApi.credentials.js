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
        // Test credentials by calling auth verify endpoint
        this.test = {
            request: {
                baseURL: '={{$credentials.baseUrl}}',
                url: '/api/v1/auth/verify',
                method: 'GET',
                headers: {
                    Authorization: '=Bearer {{$credentials.apiKey}}',
                },
            },
        };
    }
}
exports.LaikaTestApi = LaikaTestApi;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTGFpa2FUZXN0QXBpLmNyZWRlbnRpYWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vY3JlZGVudGlhbHMvTGFpa2FUZXN0QXBpLmNyZWRlbnRpYWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLCtDQUErQztBQUMvQyxNQUFhLFlBQVk7SUFBekI7UUFDRSxTQUFJLEdBQUcsY0FBYyxDQUFDO1FBQ3RCLGdCQUFXLEdBQUcsZUFBZSxDQUFDO1FBQzlCLHFCQUFnQixHQUFHLDRCQUE0QixDQUFDO1FBRWhELGVBQVUsR0FBc0I7WUFDOUI7Z0JBQ0UsV0FBVyxFQUFFLFNBQVM7Z0JBQ3RCLElBQUksRUFBRSxRQUFRO2dCQUNkLElBQUksRUFBRSxRQUFRO2dCQUNkLFdBQVcsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUU7Z0JBQy9CLE9BQU8sRUFBRSxFQUFFO2dCQUNYLFFBQVEsRUFBRSxJQUFJO2dCQUNkLFdBQVcsRUFBRSx3QkFBd0I7YUFDdEM7WUFDRDtnQkFDRSxXQUFXLEVBQUUsVUFBVTtnQkFDdkIsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsT0FBTyxFQUFFLDJCQUEyQjtnQkFDcEMsV0FBVyxFQUFFLGdDQUFnQzthQUM5QztTQUNGLENBQUM7UUFFRixtREFBbUQ7UUFDbkQsU0FBSSxHQUEyQjtZQUM3QixPQUFPLEVBQUU7Z0JBQ1AsT0FBTyxFQUFFLDJCQUEyQjtnQkFDcEMsR0FBRyxFQUFFLHFCQUFxQjtnQkFDMUIsTUFBTSxFQUFFLEtBQUs7Z0JBQ2IsT0FBTyxFQUFFO29CQUNQLGFBQWEsRUFBRSxpQ0FBaUM7aUJBQ2pEO2FBQ0Y7U0FDRixDQUFDO0lBQ0osQ0FBQztDQUFBO0FBbkNELG9DQW1DQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IElDcmVkZW50aWFsVGVzdFJlcXVlc3QsIElDcmVkZW50aWFsVHlwZSwgSU5vZGVQcm9wZXJ0aWVzIH0gZnJvbSAnbjhuLXdvcmtmbG93JztcblxuLy8gQ3JlZGVudGlhbHMgZm9yIExhaWthVGVzdCBBUEkgYXV0aGVudGljYXRpb25cbmV4cG9ydCBjbGFzcyBMYWlrYVRlc3RBcGkgaW1wbGVtZW50cyBJQ3JlZGVudGlhbFR5cGUge1xuICBuYW1lID0gJ2xhaWthVGVzdEFwaSc7XG4gIGRpc3BsYXlOYW1lID0gJ0xhaWthVGVzdCBBUEknO1xuICBkb2N1bWVudGF0aW9uVXJsID0gJ2h0dHBzOi8vZG9jcy5sYWlrYXRlc3QuY29tJztcblxuICBwcm9wZXJ0aWVzOiBJTm9kZVByb3BlcnRpZXNbXSA9IFtcbiAgICB7XG4gICAgICBkaXNwbGF5TmFtZTogJ0FQSSBLZXknLFxuICAgICAgbmFtZTogJ2FwaUtleScsXG4gICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgIHR5cGVPcHRpb25zOiB7IHBhc3N3b3JkOiB0cnVlIH0sXG4gICAgICBkZWZhdWx0OiAnJyxcbiAgICAgIHJlcXVpcmVkOiB0cnVlLFxuICAgICAgZGVzY3JpcHRpb246ICdZb3VyIExhaWthVGVzdCBBUEkga2V5JyxcbiAgICB9LFxuICAgIHtcbiAgICAgIGRpc3BsYXlOYW1lOiAnQmFzZSBVUkwnLFxuICAgICAgbmFtZTogJ2Jhc2VVcmwnLFxuICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICBkZWZhdWx0OiAnaHR0cHM6Ly9hcGkubGFpa2F0ZXN0LmNvbScsXG4gICAgICBkZXNjcmlwdGlvbjogJ0Jhc2UgVVJMIGZvciB0aGUgTGFpa2FUZXN0IEFQSScsXG4gICAgfSxcbiAgXTtcblxuICAvLyBUZXN0IGNyZWRlbnRpYWxzIGJ5IGNhbGxpbmcgYXV0aCB2ZXJpZnkgZW5kcG9pbnRcbiAgdGVzdDogSUNyZWRlbnRpYWxUZXN0UmVxdWVzdCA9IHtcbiAgICByZXF1ZXN0OiB7XG4gICAgICBiYXNlVVJMOiAnPXt7JGNyZWRlbnRpYWxzLmJhc2VVcmx9fScsXG4gICAgICB1cmw6ICcvYXBpL3YxL2F1dGgvdmVyaWZ5JyxcbiAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgIEF1dGhvcml6YXRpb246ICc9QmVhcmVyIHt7JGNyZWRlbnRpYWxzLmFwaUtleX19JyxcbiAgICAgIH0sXG4gICAgfSxcbiAgfTtcbn1cbiJdfQ==