import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChatSession, GoogleGenerativeAI, SchemaType, SafetySetting } from "@google/generative-ai";

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  imageBase64?: string; 
}

interface Predictions {
  "width": number,
  "height": number,
  "x": number,
  "y": number,
  "confidence": number,
  "class_id": number,
  "class": string,
  "detection_id": string,
  "parent_id": string
}

interface DetectorResponse {
  "outputs": [
    {
      "predictions": {
        
        "image": {
          "width": number,
          "height": number
        },
        "predictions" : Predictions[]
      },
      "bounding_box_visualization": {
        "type": string,
        "value": string,
        "video_metadata": {
          "video_identifier": string,
          "frame_number": number,
          "frame_timestamp": string,
          "fps": number,
          "measured_fps": number,
          "comes_from_video_file": number
        }
      }
    }
  ],
  "profiler_trace": []
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})

export class ChatComponent implements AfterViewInit {
  messages: ChatMessage[] = [];
  user_input: string = '';
  selectedFile: File | null = null;
  allowedFileTypes: string = '.jpg,.jpeg,.png';
  model_response: DetectorResponse | null = null;
  isTyping: boolean = false;
  gemini_chat: ChatSession | null = null;
  isStreaming: boolean = false;
  bb_base64Image: string = '';

  @ViewChild('chatInput') chatInput!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('messageContainer') messageContainer!: ElementRef;

  // Convert File to base64
  private async convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        // Remove the data:image/jpeg;base64, prefix
        const base64 = base64String.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      if (this.selectedFile.size > 5000000) { // 5MB limit
        alert('File is too large. Please select a file under 5MB.');
        this.removeFile();
        return;
      }
    }
  }

  removeFile() {
    this.selectedFile = null;
    this.fileInput.nativeElement.value = '';
  }

  private async call_model() {
    debugger
    if(this.selectedFile){

      // Convert image to base64
      const base64Image = await this.convertFileToBase64(this.selectedFile);
          
      const response = await fetch('https://detect.roboflow.com/infer/workflows/thesis-lss/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          api_key: '',
          inputs: {
            "image": {
              "type": "base64",
              "value": base64Image
            }
          }
        })
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const result = await response.json();
      this.model_response = result as DetectorResponse;
      console.log('API Response:', result);
      
      if(this.model_response?.outputs && result.outputs.length > 0){
  
        const predictions = this.model_response.outputs[0].predictions.predictions; 
        if(predictions && predictions.length > 0){
          
          let response_text = '';
          predictions.forEach((prediction, index) => {
            
            if(prediction.class_id == 1){
              response_text += '\nStenosis detected at L' +index+ ' - L' +(index+1)+ ' IVD\n' 
            }
          });

          const visualization = this.model_response.outputs[0].bounding_box_visualization;
          this.bb_base64Image = visualization?.value; // Get the base64 image from response
          
          return response_text == '' ? 'no-stenosis detected' : response_text
        }
        else{

          return "Please use the correct MRI - JPEG Converted Image OR Clear picture of your MRI"
        }

      }
    }

    return ""
  }

  private async handleFunctionCall(functionName: string) {
    debugger
    
    switch (functionName) {
      case 'analyze_image':
        if (this.selectedFile) {
          const result = await this.call_model();
          return {
            image_description: result // This will return "stenosis detected" or "no stenosis detected"
          };
        }
        return {
          image_description: "No image provided for analysis"
        };
      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  }

  // Scroll to bottom when new messages are added
  scrollToBottom(): void {
    setTimeout(() => {
      const container = this.messageContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    });
  }

  initialize_gemini() {
    const genAI = new GoogleGenerativeAI("");
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-pro", 
      systemInstruction: {
        role: "system",
        parts: [{ 
          text: `You are an expert medical assistant specialized in Lumbar spinal stenosis and you can't diagnose anyother disease. 
                 1. Be professional and caring about user health.
                 2. If you find this text **IMAGE SELECTED - PASS IT TO ANALYZE_IMAGE FUNCTION** in prompt then always use function "analyze_image" from your tools.
                 3. If you don't find this text **IMAGE SELECTED - PASS IT TO ANALYZE_IMAGE FUNCTION** in prompt and user asking to scan the image then ask to upload an image.
                 4. Never tell user what function you are going to call for analysis.
                 5. After getting the analysis result, explain it to the user and ask questions to suggest more personalized cure routine in a clear and professional manner.
                 6. Suggest the user, some relevant exercises, diet and precautions based on their infected IVD. 
                 7. For regular conversations about lumbar spinal stenosis, provide helpful information and ask relevant questions.`
        }]
      },
      generationConfig: {
        temperature: 0,
      },
      tools: [{
        functionDeclarations: [{
          name: "analyze_image",
          description: "Analyzes an image for lumbar spinal stenosis. Use this function to get analysis on the image.",
        }]
      }]
    });
    
    const chat = model.startChat({
      
    });
    return chat
  }

  constructor(){
    this.gemini_chat = this.initialize_gemini();
  }

  ngAfterViewInit() {
    // Set focus to chat input after view is initialized
    this.chatInput.nativeElement.focus();
  }

  async sendMessage() {
    
    try {

      if (this.user_input.trim() || this.selectedFile) {
        // Add user message to chat
        if (this.user_input.trim()) {
          this.messages.push({
            role: 'user',
            content: this.user_input.trim(),
            timestamp: new Date(),
          });
        }
        
        // Store user input and clear it
        const userMessage = this.user_input.trim();
        this.user_input = '';
        this.isTyping = true;  // Show typing indicator

        try {

          const streamMessageIndex = this.messages.length;
          this.messages.push({
            role: 'model',
            content: '',
            timestamp: new Date(),
            isStreaming: true 
          });

          if (this.selectedFile) {

            let prompt = userMessage + ' **IMAGE SELECTED - PASS IT TO ANALYZE_IMAGE FUNCTION**'
            var result = await this.gemini_chat?.sendMessage(prompt);
            
            debugger
            if (result) {
              let fullResponse = '';
              
              try {
                
                console.log('Chunk:', result);
                
                // Check for function calls
                let cand_part = result.response.candidates?.[0]?.content?.parts;
                let func_call = cand_part?.[cand_part?.findIndex(x => x?.functionCall?.name == "analyze_image")]?.functionCall

                if (func_call) {
                  console.log('Function call detected:', func_call);
                  const functionResult = await this.handleFunctionCall(func_call.name);
                  
                  // Send function result back to the model
                  result = await this.gemini_chat?.sendMessage([{functionResponse: {
                    name: 'analyze_image',
                    response: functionResult
                  }}]);
                }

                const chunkText = result?.response.text();
                if (chunkText) {
                  fullResponse += chunkText;
                  this.messages[streamMessageIndex].content = fullResponse;
                  this.messages[streamMessageIndex].imageBase64 = this.bb_base64Image;
                  this.messages = [...this.messages];
                  this.scrollToBottom();
                }
              } 
              catch (error) {
                debugger
                console.error('Error processing chunk:', error);
                this.isStreaming = false; // Make sure to set streaming to false on error
                this.isTyping = false;
                let error_text = JSON.stringify(error)
                if(error_text.includes("429")){

                  this.messages[this.messages.length - 1].content = 'Unfortunately, quota on your free plan has been exhausted. Please wait until tomorrow :)';
                }
                else{
                  this.messages[this.messages.length - 1].content = 'I apologize, but I encountered an error processing your request.';
                }
                this.messages[this.messages.length - 1].isStreaming = false;
              }
              
              this.messages[streamMessageIndex].isStreaming = false;
              this.messages = [...this.messages];
            }
          } 
          else {

            let result = await this.gemini_chat?.sendMessageStream(userMessage);
  
            debugger
            if(result){
              let fullResponse = '';
              
              // Process each chunk
              for await (const chunk of result.stream) {
  
                //  Check if the chunk contains a function call
                if(chunk.candidates){

                  let func_name = chunk.candidates[0].content.parts[0].functionCall?.name
                  if (func_name) {

                    const functionResult = await this.handleFunctionCall(func_name);
                    // Send function result back to the model
                    result = await this.gemini_chat?.sendMessageStream(JSON.stringify(functionResult));
                    continue;
                  }
                }
  
                const chunkText = chunk.text();
                fullResponse += chunkText;
                
                this.messages[streamMessageIndex].content = fullResponse;
                this.messages = [...this.messages];
                this.scrollToBottom();
              }
  
              // Set streaming to false for this message when done
              this.messages[streamMessageIndex].isStreaming = false;
              this.messages = [...this.messages];
            }
  
            this.isStreaming = false; // Set streaming to false when complete
            this.removeFile();  
          }

          }
        catch (error) {
          console.error('Error calling Gemini API:', error);
          this.isStreaming = false; // Make sure to set streaming to false on error
          this.isTyping = false;
          let error_text = JSON.stringify(error)
          if(error_text.includes("429")){

            this.messages[this.messages.length - 1].content = 'Unfortunately, quota on your free plan has been exhausted. Please wait until tomorrow :)';
          }
          else{
            this.messages[this.messages.length - 1].content = 'I apologize, but I encountered an error processing your request.';
          }
          this.messages[this.messages.length - 1].isStreaming = false;
        } 
        
        this.isTyping = false;
        this.scrollToBottom();
        this.removeFile();  

      }
    } 
    catch (error) {
      console.error('Error in sendMessage:', error);
      this.isStreaming = false; // Make sure to set streaming to false on error
      this.isTyping = false;
    }

  }
}
