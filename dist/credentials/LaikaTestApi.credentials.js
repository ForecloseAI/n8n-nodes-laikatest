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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTGFpa2FUZXN0QXBpLmNyZWRlbnRpYWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vY3JlZGVudGlhbHMvTGFpa2FUZXN0QXBpLmNyZWRlbnRpYWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLCtDQUErQztBQUMvQyxNQUFhLFlBQVk7SUFBekI7UUFDRSxTQUFJLEdBQUcsY0FBYyxDQUFDO1FBQ3RCLGdCQUFXLEdBQUcsZUFBZSxDQUFDO1FBQzlCLHFCQUFnQixHQUFHLDRCQUE0QixDQUFDO1FBRWhELGVBQVUsR0FBc0I7WUFDOUI7Z0JBQ0UsV0FBVyxFQUFFLFNBQVM7Z0JBQ3RCLElBQUksRUFBRSxRQUFRO2dCQUNkLElBQUksRUFBRSxRQUFRO2dCQUNkLFdBQVcsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUU7Z0JBQy9CLE9BQU8sRUFBRSxFQUFFO2dCQUNYLFFBQVEsRUFBRSxJQUFJO2dCQUNkLFdBQVcsRUFBRSx3QkFBd0I7YUFDdEM7WUFDRDtnQkFDRSxXQUFXLEVBQUUsVUFBVTtnQkFDdkIsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsT0FBTyxFQUFFLDJCQUEyQjtnQkFDcEMsV0FBVyxFQUFFLGdDQUFnQzthQUM5QztTQUNGLENBQUM7SUFDSixDQUFDO0NBQUE7QUF2QkQsb0NBdUJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgSUNyZWRlbnRpYWxUeXBlLCBJTm9kZVByb3BlcnRpZXMgfSBmcm9tICduOG4td29ya2Zsb3cnO1xuXG4vLyBDcmVkZW50aWFscyBmb3IgTGFpa2FUZXN0IEFQSSBhdXRoZW50aWNhdGlvblxuZXhwb3J0IGNsYXNzIExhaWthVGVzdEFwaSBpbXBsZW1lbnRzIElDcmVkZW50aWFsVHlwZSB7XG4gIG5hbWUgPSAnbGFpa2FUZXN0QXBpJztcbiAgZGlzcGxheU5hbWUgPSAnTGFpa2FUZXN0IEFQSSc7XG4gIGRvY3VtZW50YXRpb25VcmwgPSAnaHR0cHM6Ly9kb2NzLmxhaWthdGVzdC5jb20nO1xuXG4gIHByb3BlcnRpZXM6IElOb2RlUHJvcGVydGllc1tdID0gW1xuICAgIHtcbiAgICAgIGRpc3BsYXlOYW1lOiAnQVBJIEtleScsXG4gICAgICBuYW1lOiAnYXBpS2V5JyxcbiAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgdHlwZU9wdGlvbnM6IHsgcGFzc3dvcmQ6IHRydWUgfSxcbiAgICAgIGRlZmF1bHQ6ICcnLFxuICAgICAgcmVxdWlyZWQ6IHRydWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ1lvdXIgTGFpa2FUZXN0IEFQSSBrZXknLFxuICAgIH0sXG4gICAge1xuICAgICAgZGlzcGxheU5hbWU6ICdCYXNlIFVSTCcsXG4gICAgICBuYW1lOiAnYmFzZVVybCcsXG4gICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgIGRlZmF1bHQ6ICdodHRwczovL2FwaS5sYWlrYXRlc3QuY29tJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQmFzZSBVUkwgZm9yIHRoZSBMYWlrYVRlc3QgQVBJJyxcbiAgICB9LFxuICBdO1xufVxuIl19